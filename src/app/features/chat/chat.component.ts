import { Component, AfterViewChecked, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../core/services/theme.service';
import { ChatService } from './chat.service';
import { Subscription } from 'rxjs';
import { MarkdownPipe } from './markdown.pipe';

type Message = {
  id: string;
  text?: string;
  images?: { url: string; name: string }[];
  timestamp: number;
  fromMe: boolean;
  isTyping?: boolean;
};

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, MarkdownPipe],
})
export class ChatComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('historyEnd') private historyEnd!: ElementRef;

  history: Message[] = [];
  messageText = '';
  selectedFiles: File[] = [];
  previews: { url: string; name: string }[] = [];

  private streamSub?: Subscription;
  private typingMessageId?: string;

  constructor(private themeService: ThemeService, private chatService: ChatService) {}

  // retorna o ícone atual para o botão de alternar tema
  get themeIcon(): string {
    return this.themeService.theme() === 'light' ? 'pi pi-moon' : 'pi pi-sun';
  }

  // Toggle theme via ThemeService
  toggleTheme() {
    const newTheme = this.themeService.theme() === 'light' ? 'dark' : 'light';
    this.themeService.switchTheme(newTheme);
  }

  // Called when file input changes
  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    Array.from(input.files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      this.selectedFiles.push(file);
      const url = URL.createObjectURL(file);
      this.previews.push({ url, name: file.name });
    });

    // clear native input so same file can be selected again if removed
    input.value = '';
  }

  removePreview(index: number) {
    const p = this.previews[index];
    if (p) URL.revokeObjectURL(p.url);
    this.previews.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }

  // Send message (adds to local history). Integration with realtime streams is next step.
  sendMessage() {
    if (!this.messageText.trim() && this.previews.length === 0) return;

    const msg: Message = {
      id: Date.now().toString(36),
      text: this.messageText.trim() || undefined,
      images: this.previews.length ? this.previews.map((p) => ({ ...p })) : undefined,
      timestamp: Date.now(),
      fromMe: true,
    };

    this.history.push(msg);
    // capture prompt to send to stream
    const prompt = msg.text ?? '';

    // reset input
    this.messageText = '';
    this.selectedFiles = [];
    this.previews = [];

    // stop any existing stream
    this.stopStream();

    // add a typing placeholder (assistant) while waiting for the stream
    const typingMsg: Message = {
      id: 'typing-' + Date.now().toString(36),
      timestamp: Date.now(),
      fromMe: false,
      isTyping: true,
    };

    this.typingMessageId = typingMsg.id;
    this.history.push(typingMsg);
    this.scrollToBottom();

    // connect to SSE and append chunks to the typing message
    this.streamSub = this.chatService.connectToStream(prompt).subscribe({
      next: (chunk: string) => {
        const idx = this.history.findIndex((m) => m.id === this.typingMessageId);
        if (idx === -1) {
          // if placeholder missing, push a new assistant message
          this.history.push({
            id: 'assistant-' + Date.now().toString(36),
            text: chunk,
            timestamp: Date.now(),
            fromMe: false,
          });
        } else {
          const m = this.history[idx];
          if (!m.text) m.text = '';
          m.text += chunk;
          m.timestamp = Date.now();
        }
        this.scrollToBottom();
      },
      error: (err) => {
        const idx = this.history.findIndex((m) => m.id === this.typingMessageId);
        if (idx !== -1) {
          this.history[idx].text = '[erro no stream]';
          this.history[idx].isTyping = false;
          this.history[idx].timestamp = Date.now();
        }
        this.stopStream();
      },
      complete: () => {
        const idx = this.history.findIndex((m) => m.id === this.typingMessageId);
        if (idx !== -1) {
          this.history[idx].isTyping = false;
          this.history[idx].timestamp = Date.now();
        }
        this.stopStream();
      },
    });
  }

  private stopStream() {
    if (this.streamSub) {
      this.streamSub.unsubscribe();
      this.streamSub = undefined;
    }
    this.typingMessageId = undefined;
    this.chatService.closeStream();
  }

  // simple auto-scroll to bottom
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom() {
    try {
      this.historyEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      // ignore
    }
  }

  ngOnDestroy(): void {
    this.stopStream();
    // revoke any created object URLs for previews
    this.previews.forEach((p) => {
      try {
        URL.revokeObjectURL(p.url);
      } catch {}
    });
  }
}
