import { useState } from "react";
import { DEFAULT_DATA_SCOPE } from "@/lib/data-scope";
import type { DeptRecord } from "@/types/auth";

export function useRolesCreateState() {
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createRoleType, setCreateRoleType] = useState<"system" | "tenant">("tenant");
  const [createSelectedMenus, setCreateSelectedMenus] = useState<string[]>([]);
  const [createSelectedButtons, setCreateSelectedButtons] = useState<string[]>([]);
  const [createDataScope, setCreateDataScope] = useState(DEFAULT_DATA_SCOPE);
  const [createSelectedDeptIds, setCreateSelectedDeptIds] = useState<Set<number>>(new Set());
  const [createDeptTree, setCreateDeptTree] = useState<DeptRecord[]>([]);

  function resetCreateForm() {
    setCode("");
    setName("");
    setDescription("");
    setCreateDataScope(DEFAULT_DATA_SCOPE);
    setCreateSelectedDeptIds(new Set());
    setCreateDeptTree([]);
    setCreateRoleType("tenant");
    setCreateSelectedMenus([]);
    setCreateSelectedButtons([]);
  }

  return {
    createOpen,
    setCreateOpen,
    code,
    setCode,
    name,
    setName,
    description,
    setDescription,
    createSelectedMenus,
    setCreateSelectedMenus,
    createRoleType,
    setCreateRoleType,
    createSelectedButtons,
    setCreateSelectedButtons,
    createDataScope,
    setCreateDataScope,
    createSelectedDeptIds,
    setCreateSelectedDeptIds,
    createDeptTree,
    setCreateDeptTree,
    resetCreateForm,
  };
}
