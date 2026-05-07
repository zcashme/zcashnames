import BetaToc from "@/components/closedbeta/BetaToc";

interface Section {
  id: string;
  label: string;
}

export default function BetaV2Toc({ sections }: { sections: Section[] }) {
  return <BetaToc sections={sections} />;
}
