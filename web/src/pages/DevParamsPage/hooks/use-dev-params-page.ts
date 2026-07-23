import { useCallback, useEffect, useState } from "react";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useClientTable } from "@/hooks/useClientTable";
import { api } from "@/lib/api";
import type { DevParamGroupDetail, DevParamGroupSummary } from "@/types/dev-param";
import type { DevParamDraft } from "../components/dev-param-group-edit-sheet";
import { useDevParamColumns } from "./use-dev-param-columns";
import { useDevParamsPageActions } from "./use-dev-params-page-actions";

export function useDevParamsPage() {
  const { formatDateTime } = useTimezone();
  const [groups, setGroups] = useState<DevParamGroupSummary[]>([]);
  const [pageLoadError, setPageLoadError] = useState("");

  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<DevParamGroupDetail | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [paramDrafts, setParamDrafts] = useState<DevParamDraft[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<DevParamGroupDetail | null>(null);

  const load = useCallback(async () => {
    const groupList = await api.devParams.groups();
    setGroups(groupList);
  }, []);

  useEffect(() => {
    load()
      .then(() => setPageLoadError(""))
      .catch((e: Error) => setPageLoadError(e.message));
  }, [load]);

  const actions = useDevParamsPageActions({
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
  });

  const devParamColumns = useDevParamColumns({
    formatDateTime,
    onEdit: (group) => void actions.openGroupEdit(group),
    onDetail: (group) => void actions.openDetail(group),
  });

  const devParamTable = useClientTable({
    pageKey: "dev_params",
    tableKey: "main",
    rows: groups,
    defaultColumns: devParamColumns,
  });

  return {
    pageLoadError,
    devParamTable,
    devParamColumns,
    formatDateTime,
    groupEditOpen,
    setGroupEditOpen,
    groupName,
    setGroupName,
    groupDescription,
    setGroupDescription,
    paramDrafts,
    groupSaving,
    handleSaveGroup: actions.handleSaveGroup,
    updateParamDraft: actions.updateParamDraft,
    detailOpen,
    setDetailOpen,
    detail,
  };
}
