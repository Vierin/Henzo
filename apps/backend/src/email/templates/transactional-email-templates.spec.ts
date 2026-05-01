import { renderContactMessageHtml } from './transactional-email-templates';

describe('renderContactMessageHtml', () => {
  it('escapes user-provided html in contact payload', () => {
    const html = renderContactMessageHtml({
      name: '<b>Eve</b>',
      email: 'eve@example.com<script>',
      message: 'Hello <img src=x onerror=alert(1)>',
      timestamp: '2026-05-01T00:00:00.000Z',
    });

    expect(html).toContain('&lt;b&gt;Eve&lt;/b&gt;');
    expect(html).toContain('eve@example.com&lt;script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});
