import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { copyToClipboard } from "@/lib/clipboard";
import { formatUserCredentialsCopy } from "@/lib/user-credentials-copy";

type CredentialsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  username: string;
  password: string;
};

export function CredentialsDialog({ open, onOpenChange, title, username, password }: CredentialsDialogProps) {
  const [copyHint, setCopyHint] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyText = useMemo(() => formatUserCredentialsCopy(username, password), [username, password]);

  async function handleCopy() {
    const ok = await copyToClipboard(copyText, inputRef.current);
    setCopyHint(ok ? "已复制到剪贴板" : "复制失败，请手动选择文本");
    if (!ok) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">管理员账号已创建，请妥善保存以下凭据（仅展示一次）：</p>
        <Textarea ref={inputRef} readOnly className="min-h-24 font-mono text-xs" value={copyText} />
        {copyHint ? <p className="text-xs text-muted-foreground">{copyHint}</p> : null}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button type="button" onClick={() => void handleCopy()}>
            复制凭据
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
