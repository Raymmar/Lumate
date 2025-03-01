import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { Person } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { PersonPreview } from "./PersonPreview";

export function PeopleTable() {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const { data: people = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/admin/people"],
    queryFn: async () => {
      const response = await fetch("/api/admin/people");
      if (!response.ok) throw new Error("Failed to fetch people");
      return response.json();
    },
  });

  const columns = [
    {
      key: "userName",
      header: "Name",
      cell: (row: Person) => row.userName || row.fullName || "—",
    },
    {
      key: "email",
      header: "Email",
      cell: (row: Person) => row.email,
    },
    {
      key: "role",
      header: "Role",
      cell: (row: Person) => row.role || "—",
    },
    {
      key: "organizationName",
      header: "Organization",
      cell: (row: Person) => row.organizationName || "—",
    },
  ];

  const actions = [
    {
      label: "View Profile",
      onClick: (person: Person) => {
        setSelectedPerson(person);
      },
    },
    {
      label: "Edit",
      onClick: (person: Person) => {
        // Placeholder for edit action
        console.log("Edit person:", person);
      },
    },
  ];

  const onRowClick = (person: Person) => {
    setSelectedPerson(person);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <DataTable 
        data={people} 
        columns={columns} 
        actions={actions}
        onRowClick={onRowClick}
      />

      <PreviewSidebar 
        open={!!selectedPerson} 
        onOpenChange={() => setSelectedPerson(null)}
      >
        {selectedPerson && (
          <PersonPreview person={selectedPerson} />
        )}
      </PreviewSidebar>
    </>
  );
}