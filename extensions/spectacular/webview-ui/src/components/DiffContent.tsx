import React from "react";
import DiffViewer from "./DiffViewer";
import { Button } from "./ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./ui/collapsible";
import { CodeXmlIcon } from "lucide-react";

interface DiffContentProps {
	isHuman: boolean;
	diffHtml: string;
	jouleCommit: string | null;
	isPartial: boolean;
	isLatestCommit: boolean;
	undoClicked: boolean;
	handleUndo: () => void;
  }

const DiffContent: React.FC<DiffContentProps> = React.memo(({
  isHuman,
  diffHtml,
  jouleCommit,
  isPartial,
  isLatestCommit,
  undoClicked,
  handleUndo
}) => {
  if (isHuman) {
    return (
      <Collapsible className="bg-white border border-gray-200 rounded-md">
        <CollapsibleTrigger className="flex items-center text-xs justify-between w-full p-2 bg-white hover:bg-gray-100 rounded-t-md">
          <span className="flex items-center italic">
            <CodeXmlIcon className="h-4 w-4 mr-2" />
            Human wrote some code...
          </span>
          <span className="font-mono text-muted-foreground text-xs">
            {jouleCommit?.substring(0, 7)}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-2">
          <DiffViewer diff={diffHtml} />
        </CollapsibleContent>
      </Collapsible>
    );
  } else {
    return (
      <>
        <DiffViewer diff={diffHtml} />
        {!isPartial && isLatestCommit && !undoClicked && (
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={handleUndo}>
              Undo commit
            </Button>
          </div>
        )}
      </>
    );
  }
});

export default DiffContent;
