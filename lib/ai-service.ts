
export const generateStudyResponse = async (prompt: string): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const p = prompt.toLowerCase();

    // Mock responses based on keywords
    if (p.includes('calculus') || p.includes('math') || p.includes('derivative') || p.includes('integral')) {
        return "Here's a hint: For calculus problems, first identify if you need the Power Rule, Chain Rule, or specific integration techniques. \n\n**Key Concept:**\nThe derivative represents the rate of change. \n\nIf you post the specific equation, I can walk you through the steps!";
    }

    if (p.includes('physics') || p.includes('force') || p.includes('motion')) {
        return "In physics, always start by drawing a Free Body Diagram! 🍎\n\nRemember Newton's Second Law: **F = ma**.\nIdentify all forces acting on the object, resolve them into components, and solve for the unknown.";
    }

    if (p.includes('exam') || p.includes('stress') || p.includes('scared') || p.includes('Fail')) {
        return "It sounds like exam season is tough right now. Remember to prioritize your mental health.\n\n**Study Tip:**\nTry the Pomodoro technique (25m work / 5m break). Focus on understanding concepts rather than rote memorization. You're more prepared than you think! 🌟";
    }

    if (p.includes('code') || p.includes('programming') || p.includes('bug') || p.includes('error')) {
        return "Debugging is part of the process! 🐛\n\n1. Check the error message carefully.\n2. Isolate the code block causing the issue.\n3. Verify your variable types.\n\nIf you share the snippet, I can help debug it line by line.";
    }

    return "That's a great question. To solve this, try to break it down into smaller parts. \n\n1. Define the core problem.\n2. List what you know.\n3. Apply relevant theories.\n\nI can provide a more detailed explanation if you add more context!";
};
