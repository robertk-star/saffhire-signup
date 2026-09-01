import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCentralTime } from "@shared/const";

const FONT_NAME = "Great Vibes";
const FONT_URL = "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap";

async function ensureFont() {
  if (!document.getElementById("saffhire-signature-font")) {
    const link = document.createElement("link");
    link.id = "saffhire-signature-font";
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
  }
  if (document.fonts?.load) {
    await document.fonts.load(`64px "${FONT_NAME}"`);
  }
}

async function renderCursive(name: string) {
  await ensureFont();
  const canvas = document.createElement("canvas");
  const width = 700;
  const height = 160;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0b1c33";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let size = 64;
  ctx.font = `${size}px "${FONT_NAME}", cursive`;
  while (size > 28 && ctx.measureText(name).width > width - 40) {
    size -= 2;
    ctx.font = `${size}px "${FONT_NAME}", cursive`;
  }
  ctx.fillText(name, 20, height / 2);
  return canvas.toDataURL("image/png");
}

export default function TypedSignature({
  initialName = "",
  value,
  acceptedAt,
  onChange,
}: {
  initialName?: string;
  value: string;
  acceptedAt?: string;
  onChange: (payload: { dataUrl: string; typedName: string; acceptedAt: string }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!name.trim()) {
        setPreview("");
        return;
      }
      const image = await renderCursive(name.trim());
      if (!cancelled) setPreview(image);
    };
    const timer = window.setTimeout(run, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name]);

  const accepted = Boolean(value && acceptedAt);

  return (
    <div className="space-y-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Type your full legal name"
        disabled={accepted}
      />
      <div className="border border-border rounded-md bg-white h-28 flex items-center px-4 overflow-hidden">
        {name.trim() ? (
          <p style={{ fontFamily: `"${FONT_NAME}", cursive`, fontSize: "2.25rem", color: "#0b1c33", lineHeight: 1 }}>
            {name.trim()}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Cursive preview will appear here</p>
        )}
      </div>
      {accepted ? (
        <div className="text-sm">
          <p>Signature accepted.</p>
          <p className="text-xs text-muted-foreground">Accepted {formatCentralTime(acceptedAt)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => onChange({ dataUrl: "", typedName: name.trim(), acceptedAt: "" })}
          >
            Clear and retype
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={!name.trim() || !preview}
          onClick={async () => {
            const dataUrl = preview || await renderCursive(name.trim());
            onChange({
              dataUrl,
              typedName: name.trim(),
              acceptedAt: new Date().toISOString(),
            });
          }}
        >
          Accept this as my signature
        </Button>
      )}
    </div>
  );
}
