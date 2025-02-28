import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Member extends User {
  person?: {
    fullName: string | null;
    avatarUrl: string | null;
    organizationName: string | null;
    jobTitle: string | null;
  };
}

export function MembersTable() {
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
  });

  const columns = [
    {
      key: "profile",
      title: "Profile",
      cell: (row: Member) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {row.person?.avatarUrl ? (
              <AvatarImage src={row.person.avatarUrl} alt={row.displayName || 'Profile'} />
            ) : (
              <AvatarFallback>
                {row.displayName?.charAt(0) || row.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.displayName || "—"}</span>
            <span className="text-sm text-muted-foreground">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: "organization",
      title: "Organization",
      cell: (row: Member) => (
        <div className="flex flex-col">
          <span>{row.person?.organizationName || "—"}</span>
          {row.person?.jobTitle && (
            <span className="text-sm text-muted-foreground">{row.person.jobTitle}</span>
          )}
        </div>
      )
    },
    {
      key: "status",
      title: "Status",
      cell: (row: Member) => (
        <Badge variant={row.isVerified ? "default" : "secondary"}>
          {row.isVerified ? "Verified" : "Unverified"}
        </Badge>
      )
    },
    {
      key: "created",
      title: "Joined",
      cell: (row: Member) => format(new Date(row.createdAt), "PPP"),
    },
    {
      key: "updated",
      title: "Last Updated",
      cell: (row: Member) => format(new Date(row.updatedAt), "PPP"),
    }
  ];

  const actions = [
    {
      label: "View Profile",
      onClick: (member: Member) => {
        window.location.href = `/people/${member.personId}`;
      },
    },
    {
      label: "Edit Member",
      onClick: (member: Member) => {
        console.log("Edit member:", member);
      },
    },
    {
      label: member => member.isVerified ? "Revoke Verification" : "Verify Member",
      onClick: (member: Member) => {
        console.log("Toggle verification:", member);
      },
    }
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading members...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Members</h2>
      </div>
      <DataTable data={members} columns={columns} actions={actions} />
    </div>
  );
}
