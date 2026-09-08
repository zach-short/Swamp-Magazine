// Thames-style marquee, shared by the live landing (and whoever needs it
// next). CSS-driven (globals.css .animate-marquee) so it costs no JS; the
// doubled span closes the loop seamlessly. Direction A moved it onto ink and
// took away its cream band -- the footer rule above it is the only line now.
export function MarqueeTicker({ line }: { line: string }) {
  const half = line.repeat(4);

  return (
    <div className="overflow-hidden text-brand-red">
      {/* whitespace-pre (not nowrap): the line ends in a space that HTML would
          collapse at each span boundary, visibly breaking the loop's rhythm. */}
      <div className="animate-marquee flex w-max whitespace-pre font-display text-[13px] tracking-[0.12em] md:text-[15px]">
        <span>{half}</span>
        <span aria-hidden>{half}</span>
      </div>
    </div>
  );
}
