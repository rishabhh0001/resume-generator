
document.addEventListener('DOMContentLoaded', () => {
    const aiBtn = document.getElementById('aiReviewBtn');
    const tipsContainer = document.getElementById('aiTipsContainer');

    let isInsightShown = false;

    aiBtn.addEventListener('click', async () => {
        if (aiBtn.disabled) return;

        // Toggle behavior: If already shown, hide it
        if (isInsightShown) {
            tipsContainer.innerHTML = '<p class="ai-empty-text">Click "Get Insight" to analyze your current content.</p>';
            isInsightShown = false;
            aiBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Get Insight`;
            return;
        }

        // 1. Prepare data
        const data = window.resumeData;
        if (!data || !data.personal.firstName) {
            toast('Please enter some basic info first!');
            return;
        }

        // 2. Loading state
        setAiLoading(true);
        tipsContainer.innerHTML = '<div style="display:flex; justify-content:center; padding:20px;"><div class="loader-ai-spinner"></div></div>';

        try {
            // 3. Call AI (NVIDIA API)
            const feedback = await fetchAiFeedback(data);

            // 4. Render results
            renderAiTips(feedback);
            isInsightShown = true;
            aiBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> Refresh Insight`;
        } catch (err) {
            console.error('AI Error:', err);
            tipsContainer.innerHTML = `<p class="ai-empty-text" style="color: #ef4444;">Error: ${err.message}</p>`;
            toast('AI Review failed. Check console.');
        } finally {
            setAiLoading(false);
        }
    });

    async function fetchAiFeedback(resume) {
        const apiKey = localStorage.getItem('NVIDIA_API_KEY') || '';

        if (!apiKey) {
            await new Promise(r => setTimeout(r, 1500));
            promptForApiKey();
            return getMockFeedback(resume);
        }

        // Expanded prompt for "Strategic Analysis"
        const prompt = `Perform a high-level strategic analysis of this resume for ${resume.personal.name}.
        Job Title: ${resume.personal.jobTitle || 'N/A'}
        Summary: ${resume.summary || 'N/A'}
        Experience: ${resume.experience.map(e => e.title + ' at ' + e.company + ' (' + e.description + ')').join('; ')}
        Skills: ${resume.skills.map(s => s.name).join(', ')}
        
        Provide 3-4 professional, high-impact tips (INSIGHTS) to make this resume land a top-tier role. 
        Focus on: Impact, Quantified results, and Modern layout trends.
        Format as a JSON array of objects with "title" and "text" fields.`;

        try {
            const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "mistralai/mistral-large-3-675b-instruct-2512",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.1,
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
            const jsonStr = content.substring(content.indexOf('['), content.lastIndexOf(']') + 1);
            return JSON.parse(jsonStr);
        } catch (err) {
            console.error('NVIDIA API Error:', err);
            return getMockFeedback(resume);
        }
    }

    /**
     * SMART PDF PARSING: Converts raw text from PDF/Paste into structured JSON
     */
    window.parseResumeTextWithAi = async function(text) {
        const apiKey = localStorage.getItem('NVIDIA_API_KEY') || '';
        
        if (!apiKey) {
            toast('Enter NVIDIA API Key in AI Insights for Smart PDF Parsing!');
            return null;
        }

        const prompt = `Convert the following raw resume text into a CLEAN, STRUCTURED JSON object.
        Follow this EXACT schema:
        {
          "personal": { "firstName": "", "lastName": "", "email": "", "phone": "", "location": "", "jobTitle": "", "linkedin": "", "github": "", "website": "" },
          "summary": "",
          "experience": [ { "company": "", "title": "", "location": "", "start": "", "end": "", "current": false, "description": "" } ],
          "education": [ { "institution": "", "degree": "", "field": "", "start": "", "end": "", "description": "" } ],
          "skills": [ { "name": "", "level": "intermediate" } ],
          "projects": [ { "name": "", "description": "", "link": "" } ],
          "languages": [ { "name": "", "level": "Professional" } ]
        }

        RAW TEXT:
        ${text.substring(0, 10000)}

        Return ONLY the JSON object. No markdown, no prose.`;

        try {
            const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "mistralai/mistral-large-3-675b-instruct-2512",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.05,
                    top_p: 0.7,
                    max_tokens: 2048,
                })
            });

            if (!response.ok) throw new Error('AI Parsing failed');
            
            const result = await response.json();
            const content = result.choices[0].message.content;
            const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
            return JSON.parse(jsonStr);
        } catch (err) {
            console.error('AI Parsing Error:', err);
            return null;
        }
    };

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
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Get Insight';
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

    // ---- AI CHAT ASSISTANT LOGIC ----
    const chatDrawer = document.getElementById('aiChatDrawer');
    const chatBtn = document.getElementById('aiAssistantBtn');
    const chatClose = document.getElementById('closeAiChat');
    const chatInput = document.getElementById('aiChatInput');
    const chatSend = document.getElementById('sendAiChatBtn');
    const chatMessages = document.getElementById('aiChatMessages');

    if (chatBtn) {
        chatBtn.addEventListener('click', () => {
            chatDrawer.classList.add('open');
            chatInput.focus();
        });
    }
    if (chatClose) {
        chatClose.addEventListener('click', () => chatDrawer.classList.remove('open'));
    }

    if (chatSend) {
        chatSend.addEventListener('click', () => handleChatSend());
    }
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSend();
            }
        });
    }

    async function handleChatSend() {
        const msg = chatInput.value.trim();
        if (!msg || chatSend.disabled) return;

        chatInput.value = '';
        appendMessage('user', msg);

        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-msg bot';
        typingDiv.id = typingId;
        typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const response = await fetchAiAssistantResponse(msg);
            const tDiv = document.getElementById(typingId);
            if (tDiv) tDiv.remove();

            if (response.message) {
                appendMessage('bot', response.message);
            }

            if (response.updatedData) {
                if (typeof window.loadResumeData === 'function') {
                    window.loadResumeData(response.updatedData);
                    toast('AI updated your resume! ✨');
                } else {
                    Object.assign(window.resumeData, response.updatedData);
                    if (typeof renderAllEditors === 'function') renderAllEditors();
                    if (typeof renderResume === 'function') renderResume();
                }
            }
        } catch (err) {
            console.error('Chat AI Error:', err);
            const tDiv = document.getElementById(typingId);
            if (tDiv) tDiv.innerHTML = 'Sorry, I hit a snag. Please check your API key.';
        }
    }

    function appendMessage(sender, text) {
        const div = document.createElement('div');
        div.className = `ai-msg ${sender}`;
        div.textContent = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function fetchAiAssistantResponse(userMsg) {
        const apiKey = localStorage.getItem('NVIDIA_API_KEY') || '';
        if (!apiKey) {
            promptForApiKey();
            throw new Error('No API Key');
        }

        const systemPrompt = `You are a professional Resume Assistant. You have full control over the user's resume data.
        If the user asks to add, remove, or change information, you MUST return a JSON object with:
        1. "message": A brief, professional confirmation of what you did.
        2. "updatedData": The ENTIRE updated resume data object including their changes.
        
        Keep the resume data structure consistent:
        {
          "personal": { "firstName", "lastName", "jobTitle", "email", "phone", "location", "website", "linkedin", "github" },
          "summary": "",
          "experience": [ { "company", "title", "location", "start", "end", "current", "description" } ],
          "education": [ { "institution", "degree", "field", "start", "end", "description" } ],
          "skills": [ { "name", "level" } ],
          "projects": [ { "name", "description", "tech", "url" } ],
          "languages": [ { "name", "level" } ]
        }

        Current Data: ${JSON.stringify(window.resumeData)}
        
        Return ONLY a JSON object. No markdown.`;

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "mistralai/mistral-large-3-675b-instruct-2512",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMsg }
                ],
                temperature: 0.1,
                max_tokens: 3000
            })
        });

        if (!response.ok) throw new Error('Assistant API failed');
        const result = await response.json();
        const content = result.choices[0].message.content;
        const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        return JSON.parse(jsonStr);
    }
});
