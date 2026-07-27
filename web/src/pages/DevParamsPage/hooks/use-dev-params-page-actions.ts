import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { errorMessage, showToastError, showToastSuccess } from "@/lib/form-feedback";
import { normalizeOssDomain, validateOssDomain } from "@/lib/oss-domain";
import type { DevParamGroupDetail, DevParamGroupSummary, DevParamsClient } from "@/types/dev-param";
import type { DevParamDraft } from "../components/dev-param-group-edit-sheet";

function toParamDrafts(detail: DevParamGroupDetail): DevParamDraft[] {
  return detail.params.map((item) => ({
    param_key: item.param_key,
    param_value: item.param_value,
    remark: item.remark,
    label: item.label,
    description: item.description,
    placeholder: item.placeholder,
    field_type: item.field_type,
    editable: item.editable,
    configured: item.configured,
    select_options: item.select_options,
  }));
}

type DevParamsPageActionsOptions = {
  client: DevParamsClient;
  load: () => Promise<void>;
  editingDetail: DevParamGroupDetail | null;
  groupName: string;
  groupDescription: string;
  paramDrafts: DevParamDraft[];
  setEditingDetail: (detail: DevParamGroupDetail | null) => void;
  setGroupName: (name: string) => void;
  setGroupDescription: (description: string) => void;
  setParamDrafts: Dispatch<SetStateAction<DevParamDraft[]>>;
  setGroupEditOpen: (open: boolean) => void;
  setGroupSaving: (saving: boolean) => void;
  setDetail: (detail: DevParamGroupDetail | null) => void;
  setDetailOpen: (open: boolean) => void;
};

export function useDevParamsPageActions({
  client,
  load,
  editingDetail,
  groupName,
  groupDescription,
  paramDrafts,
  setEditingDetail,
  setGroupName,
  setGroupDescription,
  setParamDrafts,
  setGroupEditOpen,
  setGroupSaving,
  setDetail,
  setDetailOpen,
}: DevParamsPageActionsOptions) {
  const openGroupEdit = useCallback(
    async (group: DevParamGroupSummary) => {
      try {
        const data = await client.getGroup(group.id);
        setEditingDetail(data);
        setGroupName(data.name);
        setGroupDescription(data.description);
        setParamDrafts(toParamDrafts(data));
        setGroupEditOpen(true);
      } catch (err) {
        showToastError(errorMessage(err, "加载分组失败"));
      }
    },
    [client, setEditingDetail, setGroupDescription, setGroupEditOpen, setGroupName, setParamDrafts],
  );

  const openDetail = useCallback(
    async (group: DevParamGroupSummary) => {
      try {
        const data = await client.getGroup(group.id);
        setDetail(data);
        setDetailOpen(true);
      } catch (err) {
        showToastError(errorMessage(err, "加载详情失败"));
      }
    },
    [client, setDetail, setDetailOpen],
  );

  const updateParamDraft = useCallback(
    (paramKey: string, patch: Partial<Pick<DevParamDraft, "param_value" | "remark">>) => {
      setParamDrafts((prev) => prev.map((item) => (item.param_key === paramKey ? { ...item, ...patch } : item)));
    },
    [setParamDrafts],
  );

  const handleSaveGroup = useCallback(async () => {
    if (!editingDetail) return;
    if (!groupName.trim()) {
      showToastError("请填写分组名称");
      return;
    }
    setGroupSaving(true);
    try {
      const groupChanged = groupName.trim() !== editingDetail.name || groupDescription !== editingDetail.description;
      if (groupChanged) {
        await client.updateGroup(editingDetail.id, {
          name: groupName.trim(),
          description: groupDescription,
        });
      }

      const originalByKey = new Map(editingDetail.params.map((item) => [item.param_key, item]));
      for (const draft of paramDrafts) {
        const original = originalByKey.get(draft.param_key);
        if (!original?.editable || draft.field_type === "readonly") continue;
        let paramValue = draft.param_value;
        if (draft.param_key === "oss.domain") {
          const domainError = validateOssDomain(paramValue);
          if (domainError) {
            showToastError(domainError);
            return;
          }
          paramValue = normalizeOssDomain(paramValue);
        }
        const valueChanged = paramValue !== original.param_value;
        const remarkChanged = draft.remark !== original.remark;
        if (!valueChanged && !remarkChanged) continue;
        await client.update(draft.param_key, {
          param_value: paramValue,
          remark: draft.remark,
        });
      }

      showToastSuccess("已保存");
      setGroupEditOpen(false);
      setEditingDetail(null);
      setParamDrafts([]);
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "保存失败"));
    } finally {
      setGroupSaving(false);
    }
  }, [
    client,
    editingDetail,
    groupDescription,
    groupName,
    load,
    paramDrafts,
    setEditingDetail,
    setGroupEditOpen,
    setGroupSaving,
    setParamDrafts,
  ]);

  return {
    openGroupEdit,
    openDetail,
    updateParamDraft,
    handleSaveGroup,
  };
}
