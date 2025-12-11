import React from "react";
import InternalError from "../types/internal-error";
import {CustomCollapsible} from "./ui/collapsible";

interface Props {
    errors: InternalError[];
}

/**
 * Component to display internal errors
 * @param errors - List of internal errors to display
 */
const InternalErrorDisplay: React.FC<Props> = ({errors}) => {
    return (
        <ul className="px-2 py-2 font-mono text-sm">
            {errors.map((error, index) => (
                <li key={index}>
                    {error.exception ? (
                        <CustomCollapsible title={error.error}>
                            <pre>{error.exception.message}</pre>
                        </CustomCollapsible>
                    ) : (
                        <span>{error.error}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}

export default InternalErrorDisplay;