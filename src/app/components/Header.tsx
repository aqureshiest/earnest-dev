import React from "react";

const Header: React.FC = () => {
    return (
        <header className="bg-teal-700 text-white py-4 shadow-md">
            <div className="container mx-auto flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    <a href="/">Earnest Dev</a>
                </h1>
                <div className="text-sm">
                    <span>AI Code Generator</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
