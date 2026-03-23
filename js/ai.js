// js/ai.js — AI Integration for Resume Review & Tips

document.addEventListener('DOMContentLoaded', () => {
    const aiBtn = document.getElementById('aiReviewBtn');
    const tipsContainer = document.getElementById('aiTipsContainer');

    if (!aiBtn) return;

    aiBtn.addEventListener('click', async () => {
        if (aiBtn.disabled) return;

        // 1. Prepare data
        const data = window.resumeData;
        if (!data || !data.personal.name) {
            toast('Please enter some basic info first!');
            return;
        }

        // 2. Loading state
        setAiLoading(true);
        tipsContainer.innerHTML = '<div style="display:flex; justify-content:center; padding:20px;"><div class="loader-ai"></div></div>';

        try {
            // 3. Call AI (NVIDIA API)
            const feedback = await fetchAiFeedback(data);
            
            // 4. Render results
            renderAiTips(feedback);
        } catch (err) {
            console.error('AI Error:', err);
            tipsContainer.innerHTML = `<p class="ai-empty-text" style="color: #ef4444;">Error: ${err.message}</p>`;
            toast('AI Review failed. Check console.');
        } finally {
            setAiLoading(false);
        }
    });

    async function fetchAiFeedback(resume) {
        // In a real production app, you'd call a backend to avoid exposing keys.
        // For this demo/tool, we'll try to get the key from a global 'config' or localStorage.
        const apiKey = localStorage.getItem('NVIDIA_API_KEY') || '';
        
        if (!apiKey) {
            // Mock response if no key is found, then ask user
            await new Promise(r => setTimeout(r, 1500)); // simulate lag
            promptForApiKey();
            return getMockFeedback(resume);
        }

        const prompt = `Review this resume for ${resume.personal.name}. 
        Targeting: ${resume.personal.title}.
        Experience: ${resume.experience.map(e => e.title + ' at ' + e.company).join(', ')}.
        Skills: ${resume.skills.map(s => s.name).join(', ')}.
        
        Provide 3-4 professional tips for improvement. Format as a JSON array of objects with "title" and "text" fields.`;

        try {
            const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "nvidia/llama-3.1-405b-instruct",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.2,
                    top_p: 0.7,
                    max_tokens: 1024,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const result = await response.json();
            const content = result.choices[0].message.content;
            
            // Extract JSON from response
            const jsonStr = content.substring(content.indexOf('['), content.lastIndexOf(']') + 1);
            return JSON.parse(jsonStr);
        } catch (err) {
            console.error('NVIDIA API Error:', err);
            return getMockFeedback(resume); // Fallback to mock for demo
        }
    }

    function renderAiTips(tips) {
        if (!tips || tips.length === 0) {
            tipsContainer.innerHTML = '<p class="ai-empty-text">AI could not generate tips at this time.</p>';
            return;
        }

        tipsContainer.innerHTML = tips.map(tip => `
            <div class="ai-tip">
                <span class="ai-tip-title">${esc(tip.title)}</span>
                <span class="ai-tip-text">${esc(tip.text)}</span>
            </div>
        `).join('');
    }

    function setAiLoading(isLoading) {
        aiBtn.disabled = isLoading;
        aiBtn.innerHTML = isLoading ? 
            '<div class="loader-ai"></div> Reviewing...' : 
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Review with AI';
    }

    function getMockFeedback(resume) {
        const tips = [
            { 
                title: "Action Verbs", 
                text: "Start your bullet points with strong action verbs like 'Spearheaded', 'Orchestrated', or 'Developed' to show impact." 
            },
            { 
                title: "Quantifiable Metrics", 
                text: "Try to add numbers (e.g., 'Increased efficiency by 20%') to your experience descriptions to give them more weight." 
            },
            { 
                title: "Skill Grouping", 
                text: "Since you have ${resume.skills.length} skills, consider grouping them by 'Core' and 'Familiar' for better readability." 
            }
        ];
        return tips;
    }

    function promptForApiKey() {
        if (localStorage.getItem('NVIDIA_API_KEY_PROMPTED')) return;
        
        const key = prompt("The AI Reviewer can use NVIDIA's API for better results. Enter your NVIDIA API Key (or leave blank to use Demo mode):");
        if (key) {
            localStorage.setItem('NVIDIA_API_KEY', key);
            toast('API Key saved! Click Review again.');
        }
        localStorage.setItem('NVIDIA_API_KEY_PROMPTED', 'true');
    }

    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
});
