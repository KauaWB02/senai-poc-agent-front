import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private eventSource?: EventSource;

  constructor(private http: HttpClient, private ngZone: NgZone) {}

  /**
   * Conecta ao stream SSE em http://localhost:300/events?prompt=<prompt>
   * Retorna um Observable que emite cada chunk (event.data) recebido.
   */
  connectToStream(prompt: string): Observable<string> {
    const url = `http://localhost:3000/events?prompt=${encodeURIComponent(prompt)}`;

    return new Observable<string>(subscriber => {
      // Fecha conexão anterior, se houver
      this.closeStream();

      try {
        this.eventSource = new EventSource(url);

        this.eventSource.onopen = () => {
          // conexão aberta (opcional)
        };

        this.eventSource.onmessage = (event: MessageEvent) => {
          // Garantir execução dentro do Angular zone para updates de UI
          this.ngZone.run(() => {
            const data = event.data;

            // Se o backend enviar um marcador de fim, completar o Observable
            if (typeof data === 'string' && data.trim() === 'FIM') {
              try {
                subscriber.complete();
              } finally {
                this.closeStream();
              }
              return;
            }

            subscriber.next(data);
          });
        };

        this.eventSource.onerror = (err) => {
          // Não repassar o erro diretamente para o assinante — muitos erros de EventSource
          // são transitórios (CORS, conexões sendo resetadas) e disparariam um erro na UI.
          // Em vez disso, logamos e completamos apenas se a conexão estiver fechada.
          // Isso facilita mostrar respostas parciais recebidas antes do erro.
          // Para debug: verifique as headers no DevTools (Content-Type, charset e CORS).
          // Ex.: Content-Type: text/event-stream; charset=utf-8
          console.error('[ChatService] EventSource error:', err);

          const state = this.eventSource?.readyState;
          // 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
          if (state === EventSource.CLOSED) {
            this.ngZone.run(() => subscriber.complete());
          }

          // não fechar automaticamente aqui para permitir o assinante receber mensagens
          // já processadas; se desejar, podemos fechar: this.closeStream();
        };
      } catch (err) {
        // Erro síncrono ao criar EventSource
        subscriber.error(err as any);
      }

      // Cleanup quando o assinante cancelar
      return () => this.closeStream();
    });
  }

  /** Fecha a conexão SSE atual, se existir. */
  closeStream(): void {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (e) {
        // ignorar erros ao fechar
      } finally {
        this.eventSource = undefined;
      }
    }
  }
}
