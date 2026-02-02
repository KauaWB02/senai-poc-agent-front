import { Component, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../core/services/theme.service';

type Message = {
  id: string;
  text?: string;
  images?: { url: string; name: string }[];
  timestamp: number;
  fromMe: boolean;
};

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('historyEnd') private historyEnd!: ElementRef;

  history: Message[] = [];
  messageText = '';
  selectedFiles: File[] = [];
  previews: { url: string; name: string }[] = [];

  constructor(private themeService: ThemeService) {}

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

    // reset input
    this.messageText = '';
    this.selectedFiles = [];
    this.previews = [];
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
}
