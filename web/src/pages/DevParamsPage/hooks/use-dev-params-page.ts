import { useCallback, useEffect, useState } from "react";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useClientTable } from "@/hooks/useClientTable";
import { api } from "@/lib/api";
import type { DevParamGroupDetail, DevParamGroupSummary, DevParamsClient } from "@/types/dev-param";
import type { DevParamDraft } from "../components/dev-param-group-edit-sheet";
import { useDevParamColumns } from "./use-dev-param-columns";
import { useDevParamsPageActions } from "./use-dev-params-page-actions";

export type DevParamsPageOptions = {
  client?: DevParamsClient;
  pageKey?: string;
  pageTitle?: string;
  updatePermission?: string;
  listPermission?: string;
};

export function useDevParamsPage(options: DevParamsPageOptions = {}) {
  const client = options.client ?? api.devParams;
  const pageKey = options.pageKey ?? "dev_params";
  const pageTitle = options.pageTitle ?? (pageKey === "sys_dev_params" ? "系统开发参数" : "开发参数");
  const updatePermission = options.updatePermission ?? "dev_param.update";
  const listPermission = options.listPermission ?? "dev_param.list";
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
    const groupList = await client.groups();
    setGroups(groupList);
  }, [client]);

  useEffect(() => {
    load()
      .then(() => setPageLoadError(""))
      .catch((e: Error) => setPageLoadError(e.message));
  }, [load]);

  const actions = useDevParamsPageActions({
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
  });

  const devParamColumns = useDevParamColumns({
    formatDateTime,
    onEdit: (group) => void actions.openGroupEdit(group),
    onDetail: (group) => void actions.openDetail(group),
    updatePermission,
    listPermission,
  });

  const devParamTable = useClientTable({
    pageKey,
    tableKey: "main",
    rows: groups,
    defaultColumns: devParamColumns,
  });

  return {
    pageLoadError,
    updatePermission,
    pageTitle,
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
