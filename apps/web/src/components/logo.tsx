export function Logo({ size = "md", inverted = false }: { size?: "sm" | "md" | "lg"; inverted?: boolean }) {
  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl" };
  return (
    <div className={`font-black tracking-tight leading-none ${sizes[size]}`}>
      <span className={inverted ? "text-blue-400" : "text-[#1B2A4A] dark:text-blue-400"}>LVX</span>
      <span className={inverted ? "text-white" : "text-gray-900 dark:text-white"}>LICITAÇÃO</span>
    </div>
  );
}
