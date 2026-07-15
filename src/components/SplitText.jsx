import React from "react";

function SplitText({
  text = "",
  className = "",
  delay = 34,
  splitType = "chars",
  tag = "p",
  textAlign = "left"
}) {
  const Tag = tag || "p";
  const parts = splitType.includes("words") ? text.split(/(\s+)/) : [...text];

  return (
    <Tag className={`split-parent ${className}`} style={{ textAlign }}>
      {parts.map((part, index) => {
        const isBreak = part === "\n";
        const isSpace = /^\s+$/.test(part);
        if (isBreak) return <br key={`break-${index}`} />;
        return (
          <span
            className={isSpace ? "split-space" : "split-char"}
            style={{ "--split-delay": `${index * delay}ms` }}
            key={`${part}-${index}`}
          >
            {isSpace ? "\u00a0" : part}
          </span>
        );
      })}
    </Tag>
  );
}

export default SplitText;
