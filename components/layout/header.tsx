import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { GlobalSearch } from "@/components/layout/global-search";
import { IncludeArchivedToggle } from "@/components/layout/include-archived-toggle";
import { getDataAsOfDate } from "@/lib/asOf";
import { getIncludeArchived } from "@/lib/posted-preference";

export async function Header() {
  const includeArchived = await getIncludeArchived();
  const asOf = getDataAsOfDate();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-6">
      <div className="flex flex-1 items-center justify-between gap-3">
        <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          <Calendar className="h-4 w-4" />
          <span>
            Data as of <span className="font-medium text-foreground">{format(asOf, "MMM d, yyyy")}</span>
          </span>
        </div>
        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          <IncludeArchivedToggle includeArchived={includeArchived} />
          <GlobalSearch />
        </div>
      </div>
    </header>
  );
}
