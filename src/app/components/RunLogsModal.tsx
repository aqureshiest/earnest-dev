// Sample run info files
const sampleRunInfo = {
    specifications: `
  task: Implement a user authentication system
  model: claude-3-opus-20240229
  assistant: specifications
  infoType: specifications
  timestamp: 1631234567890
  content:
    goal: Implement a secure user authentication system
    requirements:
      - User registration with email and password
      - Login functionality
      - Password hashing and salting
      - JWT token-based authentication
      - Password reset functionality
    constraints:
      - Must be compatible with React frontend
      - Should use Node.js and Express for backend
      - Database: MongoDB
  `,
    planning: `
  task: Implement a user authentication system
  model: claude-3-opus-20240229
  assistant: planning
  infoType: implementation_plan
  timestamp: 1631234569000
  steps:
    1. Set up project structure
       - Create separate directories for frontend and backend
       - Initialize npm projects for both
    2. Implement backend
       - Set up Express server
       - Create user model in MongoDB
       - Implement user registration route
       - Implement login route with JWT token generation
       - Add password reset functionality
    3. Implement frontend
       - Create registration form component
       - Create login form component
       - Implement JWT token storage and authentication logic
       - Add protected routes
    4. Testing
       - Write unit tests for backend routes
       - Write integration tests for frontend components
    5. Documentation
       - Create API documentation
       - Write user guide for authentication system
  `,
    code: `
  task: Implement a user authentication system
  model: claude-3-opus-20240229
  assistant: code
  infoType: generated_code
  timestamp: 1631234570000
  files:
    - path: backend/server.js
      content: |
        const express = require('express');
        const mongoose = require('mongoose');
        const bcrypt = require('bcrypt');
        const jwt = require('jsonwebtoken');
  
        const app = express();
        app.use(express.json());
  
        mongoose.connect('mongodb://localhost/auth_system', { useNewUrlParser: true, useUnifiedTopology: true });
  
        // User model and routes implementation...
  
        app.listen(3000, () => console.log('Server running on port 3000'));
  
    - path: frontend/src/components/Login.js
      content: |
        import React, { useState } from 'react';
        import axios from 'axios';
  
        const Login = () => {
          const [email, setEmail] = useState('');
          const [password, setPassword] = useState('');
  
          const handleSubmit = async (e) => {
            e.preventDefault();
            try {
              const response = await axios.post('/api/login', { email, password });
              localStorage.setItem('token', response.data.token);
              // Redirect to dashboard or home page
            } catch (error) {
              console.error('Login failed:', error);
            }
          };
  
          // Form JSX...
        };
  
        export default Login;
  
    # More files...
  `,
    pr: `
  task: Implement a user authentication system
  model: claude-3-opus-20240229
  assistant: pr
  infoType: pull_request
  timestamp: 1631234571000
  pr_title: Implement User Authentication System
  pr_body: |
    This pull request implements a secure user authentication system with the following features:
    - User registration
    - Login functionality
    - JWT token-based authentication
    - Password reset functionality
  
    The implementation includes both backend (Node.js/Express) and frontend (React) components.
  
    Please review the changes and provide feedback.
  
  files_changed:
    - backend/server.js
    - backend/models/User.js
    - backend/routes/auth.js
    - frontend/src/components/Login.js
    - frontend/src/components/Register.js
    - frontend/src/utils/auth.js
  `,
};

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Maximize, Maximize2, Minimize, Minimize2, X } from "lucide-react";

interface RunLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    runInfo: RunInfo;
}

interface RunInfo {
    specifications: SectionInfo;
    planning: SectionInfo;
    code: SectionInfo;
    pr: SectionInfo;
}

interface SectionInfo {
    system_prompt: string;
    user_prompt: string;
    ai_response: string;
    parsed_ai_response: string;
}

type Section = "specifications" | "planning" | "code" | "pr";
type ContentType = "system_prompt" | "user_prompt" | "ai_response" | "parsed_ai_response";

const RunLogsModal: React.FC<RunLogsModalProps> = ({ isOpen, onClose }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeSection, setActiveSection] = useState<Section>("specifications");
    const [activeContent, setActiveContent] = useState<ContentType>("system_prompt");

    const runInfo = {
        specifications: {
            system_prompt: sampleRunInfo.specifications,
            user_prompt: "...",
            ai_response: sampleRunInfo.code,
            parsed_ai_response: "...",
        },
        planning: {
            system_prompt: "...",
            user_prompt: "...",
            ai_response: "...",
            parsed_ai_response: "...",
        },
        code: {
            system_prompt: "...",
            user_prompt: "...",
            ai_response: "...",
            parsed_ai_response: "...",
        },
        pr: {
            system_prompt: "...",
            user_prompt: "...",
            ai_response: "...",
            parsed_ai_response: "...",
        },
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const renderContent = (content: string) => (
        <pre className="whitespace-pre-wrap text-sm">{content}</pre>
    );

    const sections: Section[] = ["specifications", "planning", "code", "pr"];
    const contentTypes: ContentType[] = [
        "system_prompt",
        "user_prompt",
        "ai_response",
        "parsed_ai_response",
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={`
                    flex flex-col p-0 gap-0
                    ${
                        isFullscreen
                            ? "fixed inset-0 w-screen h-screen max-w-none rounded-none"
                            : "w-[90vw] max-w-5xl h-[80vh]"
                    }
                `}
                style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            >
                <DialogHeader className="flex flex-row items-center justify-between p-6">
                    <div>
                        <DialogTitle>Run Logs</DialogTitle>
                        <DialogDescription className="mt-1">
                            View the logs for the current execution
                        </DialogDescription>
                    </div>
                    <div className="flex items-center">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleFullscreen}
                            className="mr-2"
                        >
                            {isFullscreen ? (
                                <Minimize className="h-4 w-4" />
                            ) : (
                                <Maximize className="h-4 w-4" />
                            )}
                        </Button>
                        <DialogClose>
                            <X className="h-6 w-6" />
                        </DialogClose>
                    </div>
                </DialogHeader>

                <div className="flex flex-grow overflow-hidden">
                    {/* Left sidebar */}
                    <div className="w-1/4 border-r">
                        <div className="h-full overflow-y-auto">
                            {sections.map((section) => (
                                <div key={section} className="mb-4">
                                    <h3 className="px-4 py-2 font-semibold text-sm uppercase">
                                        {section}
                                    </h3>
                                    <ul>
                                        {contentTypes.map((contentType) => (
                                            <li
                                                key={`${section}-${contentType}`}
                                                className={`px-4 py-2 cursor-pointer text-sm hover:bg-gray-100
                                                    ${
                                                        activeSection === section &&
                                                        activeContent === contentType
                                                            ? "bg-gray-200"
                                                            : ""
                                                    }`}
                                                onClick={() => {
                                                    setActiveSection(section);
                                                    setActiveContent(contentType);
                                                }}
                                            >
                                                {contentType.replace("_", " ")}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right content area */}
                    <div className="flex-grow">
                        <div className="h-full px-4 py-2 overflow-y-auto">
                            <h2 className="text-xl font-bold mb-4">
                                {activeSection} - {activeContent.replace("_", " ")}
                            </h2>
                            {renderContent(runInfo[activeSection][activeContent])}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default RunLogsModal;
