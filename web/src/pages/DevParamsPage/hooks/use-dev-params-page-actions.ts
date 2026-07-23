import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { api } from "@/lib/api";
import { errorMessage, showToastError, showToastSuccess } from "@/lib/form-feedback";
import type { DevParamGroupDetail, DevParamGroupSummary } from "@/types/dev-param";
import type { DevParamDraft } from "../components/dev-param-group-edit-sheet";

function toParamDrafts(detail: DevParamGroupDetail): DevParamDraft[] {
  return detail.params.map((item) => ({
    param_key: item.param_key,
    param_value: item.param_value,
    remark: item.remark,
    label: item.label,
    description: item.description,
    field_type: item.field_type,
    editable: item.editable,
  }));
}

type DevParamsPageActionsOptions = {
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
        const data = await api.devParams.getGroup(group.id);
        setEditingDetail(data);
        setGroupName(data.name);
        setGroupDescription(data.description);
        setParamDrafts(toParamDrafts(data));
        setGroupEditOpen(true);
      } catch (err) {
        showToastError(errorMessage(err, "加载分组失败"));
      }
    },
    [setEditingDetail, setGroupDescription, setGroupEditOpen, setGroupName, setParamDrafts],
  );

  const openDetail = useCallback(
    async (group: DevParamGroupSummary) => {
      try {
        const data = await api.devParams.getGroup(group.id);
        setDetail(data);
        setDetailOpen(true);
      } catch (err) {
        showToastError(errorMessage(err, "加载详情失败"));
      }
    },
    [setDetail, setDetailOpen],
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
        await api.devParams.updateGroup(editingDetail.id, {
          name: groupName.trim(),
          description: groupDescription,
        });
      }

      const originalByKey = new Map(editingDetail.params.map((item) => [item.param_key, item]));
      for (const draft of paramDrafts) {
        const original = originalByKey.get(draft.param_key);
        if (!original?.editable) continue;
        const valueChanged = draft.param_value !== original.param_value;
        const remarkChanged = draft.remark !== original.remark;
        if (!valueChanged && !remarkChanged) continue;
        await api.devParams.update(draft.param_key, {
          param_value: draft.param_value,
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
