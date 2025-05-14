"use client";

import { useState } from "react";

export function Logo() {
    const [imgSrc, setImgSrc] = useState("/logo.svg");

    return (
        <img
            src={imgSrc}
            alt="Meeting BaaS"
            className="h-8 w-auto"
            onError={() => setImgSrc("https://meetingbaas.com/favicon.ico")}
        />
    );
} 