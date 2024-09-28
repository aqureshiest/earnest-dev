import React from "react";

const TechnicalDetailsRenderer: React.FC<{ details: string }> = ({ details }) => {
    const lines = details.split("\n");

    const renderList = (list: any) => {
        return (
            <div>
                {/* <ul> */}
                {list.map((line: string, index: number) => (
                    <div key={index}>{line}</div>
                ))}
                {/* </ul> */}
            </div>
        );
    };

    return <div className="text-sm text-gray-600 dark:text-gray-400">{renderList(lines)}</div>;
};

export default TechnicalDetailsRenderer;
