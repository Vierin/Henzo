import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

type BlogMarkdownProps = {
  content: string;
};

export function BlogMarkdown({ content }: BlogMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        h2: ({ children }) => (
          <h2 className="mt-10 mb-4 text-2xl font-semibold text-[#3F3F3F]">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-8 mb-3 text-xl font-semibold text-[#3F3F3F]">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-5 text-[1.05rem] leading-[1.7] text-[#4A4A4A]">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mb-5 list-disc space-y-2 pl-6 text-[1.05rem] leading-[1.7] text-[#4A4A4A]">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-5 list-decimal space-y-2 pl-6 text-[1.05rem] leading-[1.7] text-[#4A4A4A]">
            {children}
          </ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-[#3F3F3F]">{children}</strong>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="font-medium text-[#E86D4F] underline underline-offset-2 transition hover:text-[#d85e42]"
            rel={href?.startsWith('http') ? 'noreferrer' : undefined}
            target={href?.startsWith('http') ? '_blank' : undefined}
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-6 border-l-4 border-[#E86D4F]/40 pl-4 italic text-[#5A5A5A]">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
