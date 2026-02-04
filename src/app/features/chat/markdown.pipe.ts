import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | undefined | null): SafeHtml {
    if (!value) return '';
    // Primeiro: se o backend estiver enviando literais "\n" (barra + n), convertê-las
    // em quebras reais. Também trata \r\n.
    let s = value.replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n');

    // Escape HTML para evitar XSS
    let out = this.escapeHtml(s);

    // Converter markdown básico:
    // headings ## -> h2
    out = out.replace(/^##\s+(.*)$/gm, '<h2 class="text-sm font-semibold mb-1">$1</h2>');

    // horizontal rule --- on its own line
    out = out.replace(/^---$/gm, '<hr class="my-3 border-t" />');

    // Bold **text** antes do itálico
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic *text* (evita pegar os que já foram transformados em bold)
    out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Agora preservar parágrafos: dividir por duas ou mais quebras de linha
    const paragraphs = out.split(/\n{2,}/g).map(p => p.trim()).filter(p => p.length > 0);

    const wrapped = paragraphs
      .map(p => {
        // se já começou com uma tag block-level gerada (h2, hr) não embrulhar em <p>
        if (/^<h[1-6]|^<hr/i.test(p)) return p;
        // substituir quebras simples por <br>
        const inner = p.replace(/\n/g, '<br>');
        return `<p class="m-0 text-sm leading-relaxed">${inner}</p>`;
      })
      .join('');

    return this.sanitizer.bypassSecurityTrustHtml(wrapped);
  }

  private escapeHtml(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
