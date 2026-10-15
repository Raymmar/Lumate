import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getBadgeIcon } from "@/lib/badge-icons";
import { EventSelect, useAdminEvents, type AdminEventOption } from "@/components/admin/EventSelect";
import {
  Shield,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  Crown,
  Hash,
  HandMetal,
} from "lucide-react";

interface BadgeData {
  id: number;
  name: string;
  icon: string;
  description: string;
  isAutomatic: boolean;
  createdAt: string;
}

interface BadgeRule {
  id: number;
  badgeId: number;
  ruleType: string;
  config: Record<string, any>;
  createdAt: string;
}

type EventOption = AdminEventOption;

const ICON_OPTIONS = [
  { value: "sprout", label: "Sprout" },
  { value: "badge-dollar-sign", label: "Dollar Sign" },
  { value: "hand-metal", label: "Hand Metal" },
  { value: "tickets", label: "Tickets" },
  { value: "heart-handshake", label: "Handshake" },
  { value: "loader", label: "Loader" },
];

const RULE_TYPES = [
  {
    value: "event_attendance",
    label: "Event Attendance",
    description: "Awarded when a member attends a specific event",
    icon: CalendarCheck,
  },
  {
    value: "premium_member",
    label: "Premium Member",
    description: "Awarded to members with active premium status",
    icon: Crown,
  },
  {
    value: "event_count_min",
    label: "Minimum Event Count",
    description: "Awarded when a member has attended at least N events",
    icon: Hash,
  },
  {
    value: "event_count_max",
    label: "Maximum Event Count",
    description: "Awarded when a member has attended fewer than N events",
    icon: Hash,
  },
  {
    value: "manual_only",
    label: "Manual Only",
    description: "Only assigned manually by an admin",
    icon: HandMetal,
  },
];

function getRuleTypeLabel(ruleType: string) {
  return RULE_TYPES.find((r) => r.value === ruleType)?.label || ruleType;
}

function getRuleDescription(rule: BadgeRule, events: EventOption[]) {
  switch (rule.ruleType) {
    case "event_attendance": {
      const event = events.find((e) => e.apiId === rule.config.eventApiId);
      return event
        ? `Attended "${event.title}"`
        : `Attended event ${rule.config.eventApiId}`;
    }
    case "premium_member":
      return "Has active premium membership";
    case "event_count_min":
      return `Attended at least ${rule.config.minEvents} events`;
    case "event_count_max":
      return `Attended fewer than ${rule.config.maxEvents} events`;
    case "manual_only":
      return "Manually assigned by admin";
    default:
      return rule.ruleType;
  }
}

export default function BadgeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [expandedBadge, setExpandedBadge] = useState<number | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);
  const [newBadge, setNewBadge] = useState({
    name: "",
    icon: "sprout",
    description: "",
  });
  const [editBadge, setEditBadge] = useState({
    name: "",
    icon: "sprout",
    description: "",
  });
  const [newRule, setNewRule] = useState({
    ruleType: "",
    eventApiId: "",
    minEvents: "5",
    maxEvents: "3",
  });

  const { data: badgesData, isLoading } = useQuery<BadgeData[]>({
    queryKey: ["/api/admin/badges-list"],
    queryFn: async () => {
      const response = await fetch("/api/admin/badges-list");
      const data = await response.json();
      return data.badges;
    },
  });

  const { data: events = [] } = useAdminEvents();

  const { data: rulesData } = useQuery<BadgeRule[]>({
    queryKey: ["/api/admin/badges", expandedBadge, "rules"],
    queryFn: async () => {
      if (!expandedBadge) return [];
      const response = await fetch(
        `/api/admin/badges/${expandedBadge}/rules`
      );
      const data = await response.json();
      return data.rules;
    },
    enabled: !!expandedBadge,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      icon: string;
      description: string;
    }) => {
      return apiRequest("/api/admin/badges", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/badges-list"] });
      toast({ title: "Badge created", description: "The badge has been created successfully." });
      setIsCreateOpen(false);
      setNewBadge({ name: "", icon: "sprout", description: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create badge",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; icon?: string; description?: string; isAutomatic?: boolean };
    }) => {
      return apiRequest(`/api/admin/badges/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/badges-list"] });
      toast({ title: "Badge updated", description: "The badge has been updated successfully." });
      setIsEditOpen(false);
      setSelectedBadge(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update badge",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/badges/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/badges-list"] });
      toast({ title: "Badge deleted", description: "The badge and all its rules have been removed." });
      setIsDeleteOpen(false);
      setSelectedBadge(null);
      setExpandedBadge(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete badge",
        variant: "destructive",
      });
    },
  });

  const addRuleMutation = useMutation({
    mutationFn: async ({
      badgeId,
      ruleType,
      config,
    }: {
      badgeId: number;
      ruleType: string;
      config: Record<string, any>;
    }) => {
      return apiRequest(`/api/admin/badges/${badgeId}/rules`, "POST", {
        ruleType,
        config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/badges", expandedBadge, "rules"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/badges-list"] });
      toast({ title: "Rule added", description: "The rule has been added successfully." });
      setIsAddRuleOpen(false);
      setNewRule({ ruleType: "", eventApiId: "", minEvents: "5", maxEvents: "3" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add rule",
        variant: "destructive",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async ({
      badgeId,
      ruleId,
    }: {
      badgeId: number;
      ruleId: number;
    }) => {
      return apiRequest(`/api/admin/badges/${badgeId}/rules/${ruleId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/badges", expandedBadge, "rules"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/badges-list"] });
      toast({ title: "Rule removed", description: "The rule has been removed." });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove rule",
        variant: "destructive",
      });
    },
  });

  const handleCreateBadge = () => {
    if (!newBadge.name.trim() || !newBadge.description.trim()) return;
    createMutation.mutate(newBadge);
  };

  const handleUpdateBadge = () => {
    if (!selectedBadge) return;
    updateMutation.mutate({
      id: selectedBadge.id,
      data: editBadge,
    });
  };

  const handleAddRule = () => {
    if (!expandedBadge || !newRule.ruleType) return;

    let config: Record<string, any> = {};
    switch (newRule.ruleType) {
      case "event_attendance":
        if (!newRule.eventApiId) return;
        config = { eventApiId: newRule.eventApiId };
        break;
      case "premium_member":
        config = {};
        break;
      case "event_count_min":
        config = { minEvents: parseInt(newRule.minEvents) || 1 };
        break;
      case "event_count_max":
        config = { maxEvents: parseInt(newRule.maxEvents) || 3 };
        break;
      case "manual_only":
        config = {};
        break;
    }

    addRuleMutation.mutate({
      badgeId: expandedBadge,
      ruleType: newRule.ruleType,
      config,
    });
  };

  const openEdit = (badge: BadgeData) => {
    setSelectedBadge(badge);
    setEditBadge({
      name: badge.name,
      icon: badge.icon,
      description: badge.description,
    });
    setIsEditOpen(true);
  };

  const openDelete = (badge: BadgeData) => {
    setSelectedBadge(badge);
    setIsDeleteOpen(true);
  };

  const filteredBadges = badgesData?.filter((badge) =>
    badge.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Badges</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Badge
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search badges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredBadges && filteredBadges.length > 0 ? (
              filteredBadges.map((badge) => (
                <>
                  <TableRow key={badge.id} className="group">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setExpandedBadge(
                            expandedBadge === badge.id ? null : badge.id
                          )
                        }
                      >
                        {expandedBadge === badge.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="py-1 px-2">
                          {getBadgeIcon(badge.icon)}
                          <span className="ml-1">{badge.name}</span>
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                      {badge.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.isAutomatic ? "default" : "outline"}>
                        {badge.isAutomatic ? "Automatic" : "Manual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(badge)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDelete(badge)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedBadge === badge.id && (
                    <TableRow key={`${badge.id}-rules`}>
                      <TableCell colSpan={5} className="bg-muted/30 p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Assignment Rules
                            </h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNewRule({
                                  ruleType: "",
                                  eventApiId: "",
                                  minEvents: "5",
                                  maxEvents: "3",
                                });
                                setIsAddRuleOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Rule
                            </Button>
                          </div>
                          {!rulesData || rulesData.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No rules configured. This badge can only be
                              assigned manually.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Badge is awarded when ANY of these rules match:
                              </p>
                              {rulesData.map((rule) => {
                                const ruleType = RULE_TYPES.find(
                                  (r) => r.value === rule.ruleType
                                );
                                const RuleIcon = ruleType?.icon || Shield;
                                return (
                                  <div
                                    key={rule.id}
                                    className="flex items-center justify-between bg-background border rounded-md px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <RuleIcon className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <span className="text-sm font-medium">
                                          {getRuleTypeLabel(rule.ruleType)}
                                        </span>
                                        <span className="text-sm text-muted-foreground ml-2">
                                          — {getRuleDescription(rule, events)}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() =>
                                        deleteRuleMutation.mutate({
                                          badgeId: badge.id,
                                          ruleId: rule.id,
                                        })
                                      }
                                      disabled={deleteRuleMutation.isPending}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No badges found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Badge</DialogTitle>
            <DialogDescription>
              Add a new badge that can be assigned to members
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="badge-name" className="text-right">
                Name
              </Label>
              <Input
                id="badge-name"
                value={newBadge.name}
                onChange={(e) =>
                  setNewBadge({ ...newBadge, name: e.target.value })
                }
                className="col-span-3"
                placeholder="e.g., 2026 Summit"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="badge-icon" className="text-right">
                Icon
              </Label>
              <div className="col-span-3">
                <Select
                  value={newBadge.icon}
                  onValueChange={(value) =>
                    setNewBadge({ ...newBadge, icon: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          {getBadgeIcon(opt.value)}
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="badge-desc" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="badge-desc"
                value={newBadge.description}
                onChange={(e) =>
                  setNewBadge({ ...newBadge, description: e.target.value })
                }
                className="col-span-3"
                placeholder="Describe what this badge represents..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBadge}
              disabled={
                !newBadge.name.trim() ||
                !newBadge.description.trim() ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Badge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Badge</DialogTitle>
            <DialogDescription>
              Update the badge details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-badge-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-badge-name"
                value={editBadge.name}
                onChange={(e) =>
                  setEditBadge({ ...editBadge, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-badge-icon" className="text-right">
                Icon
              </Label>
              <div className="col-span-3">
                <Select
                  value={editBadge.icon}
                  onValueChange={(value) =>
                    setEditBadge({ ...editBadge, icon: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          {getBadgeIcon(opt.value)}
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-badge-desc" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="edit-badge-desc"
                value={editBadge.description}
                onChange={(e) =>
                  setEditBadge({ ...editBadge, description: e.target.value })
                }
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBadge}
              disabled={
                !editBadge.name.trim() ||
                !editBadge.description.trim() ||
                updateMutation.isPending
              }
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Badge</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the "{selectedBadge?.name}" badge?
              This will remove it from all members who currently have it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedBadge && deleteMutation.mutate(selectedBadge.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Badge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assignment Rule</DialogTitle>
            <DialogDescription>
              Configure when this badge should be automatically assigned
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Rule Type</Label>
              <div className="col-span-3">
                <Select
                  value={newRule.ruleType}
                  onValueChange={(value) =>
                    setNewRule({ ...newRule, ruleType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rule type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        <div className="flex items-center gap-2">
                          <rt.icon className="h-4 w-4" />
                          <span>{rt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newRule.ruleType && (
              <p className="text-sm text-muted-foreground ml-[calc(25%+1rem)]">
                {RULE_TYPES.find((r) => r.value === newRule.ruleType)?.description}
              </p>
            )}

            {newRule.ruleType === "event_attendance" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Event</Label>
                <div className="col-span-3">
                  <EventSelect
                    value={newRule.eventApiId || null}
                    onChange={(apiId) => setNewRule({ ...newRule, eventApiId: apiId ?? "" })}
                    placeholder="Select an event..."
                  />
                </div>
              </div>
            )}

            {newRule.ruleType === "event_count_min" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Min Events</Label>
                <Input
                  type="number"
                  min="1"
                  value={newRule.minEvents}
                  onChange={(e) =>
                    setNewRule({ ...newRule, minEvents: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
            )}

            {newRule.ruleType === "event_count_max" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Max Events</Label>
                <Input
                  type="number"
                  min="1"
                  value={newRule.maxEvents}
                  onChange={(e) =>
                    setNewRule({ ...newRule, maxEvents: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddRuleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddRule}
              disabled={
                !newRule.ruleType ||
                (newRule.ruleType === "event_attendance" && !newRule.eventApiId) ||
                addRuleMutation.isPending
              }
            >
              {addRuleMutation.isPending ? "Adding..." : "Add Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
