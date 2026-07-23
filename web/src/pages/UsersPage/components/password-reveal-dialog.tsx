import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { PasswordReveal } from "../types";

export function PasswordRevealDialog({
  passwordReveal,
  credentialsCopyText,
  copyHint,
  passwordInputRef,
  onClose,
  onCopy,
}: {
  passwordReveal: PasswordReveal | null;
  credentialsCopyText: string;
  copyHint: string;
  passwordInputRef: RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <Dialog
      open={passwordReveal != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent closeOnOverlayClick={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{passwordReveal?.kind === "create" ? "用户已创建" : "密码已重置"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <p className="text-muted-foreground">
            用户 <span className="font-medium text-foreground">{passwordReveal?.username}</span>{" "}
            的登录密码如下。请立即复制保存，关闭后无法再次查看，需重新重置密码才能获取新密码。
          </p>
          <Textarea
            ref={passwordInputRef}
            readOnly
            rows={4}
            value={credentialsCopyText}
            className="resize-none font-mono text-sm leading-relaxed"
            onFocus={(e) => e.target.select()}
            onClick={(e) => e.currentTarget.select()}
          />
          {copyHint ? <p className="text-xs text-muted-foreground">{copyHint}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => void onCopy()}>
            复制
          </Button>
          <Button type="button" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
