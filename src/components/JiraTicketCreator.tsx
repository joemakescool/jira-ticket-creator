import React, { useState, useEffect, useRef } from 'react';
import { 
  Copy, Wand2, FileText, Bug, CheckSquare, Zap, Upload, Settings, 
  ExternalLink, Bold, Italic, Code, List, ListOrdered, 
  Link2, Quote, Hash, Terminal, Save, FileDown, Keyboard,
  X, AlertCircle, TrendingUp, AlertTriangle, Flame,
  Layout, LayoutGrid, Edit, RefreshCw
} from 'lucide-react';

const JiraTicketCreator = () => {
  const [ticketData, setTicketData] = useState({
    title: '',
    description: '',
    type: 'Task',
    priority: 'Medium',
    template: 'Basic',
    labels: []
  });
  
  const [labelInput, setLabelInput] = useState('');
  const [generatedTicket, setGeneratedTicket] = useState('');
  const [editedTicket, setEditedTicket] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeRefinement, setActiveRefinement] = useState(null);
  const [autoGenerateTitle, setAutoGenerateTitle] = useState(true);
  const [autoCopy, setAutoCopy] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [ticketHistory, setTicketHistory] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [writingTips, setWritingTips] = useState('');
  const [autoComplete, setAutoComplete] = useState([]);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [recentLabels, setRecentLabels] = useState([]);
  const [draftSaved, setDraftSaved] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  
  const descriptionRef = useRef(null);

  const commonLabels = [
    'frontend', 'backend', 'api', 'database', 'security', 'performance',
    'ui', 'ux', 'testing', 'documentation', 'refactor', 'hotfix',
    'feature', 'improvement', 'tech-debt', 'integration', 'mobile',
    'web', 'authentication', 'authorization', 'deployment', 'monitoring'
  ];

  const quickTemplates = [
    {
      name: 'Bug Report',
      type: 'Bug',
      template: 'Bug Description\n[Describe the bug]\n\nSteps to Reproduce\n1. Go to...\n2. Click on...\n3. See error\n\nExpected Behavior\n[What should happen]\n\nActual Behavior\n[What actually happens]\n\nEnvironment\n- Browser:\n- OS:\n- Version:',
      labels: ['bug', 'needs-triage']
    },
    {
      name: 'Feature Request',
      type: 'Story',
      template: 'Feature Description\n[Describe the feature]\n\nUser Story\nAs a [type of user]\nI want [feature]\nSo that [benefit]\n\nAcceptance Criteria\n- [ ] Criteria 1\n- [ ] Criteria 2\n- [ ] Criteria 3\n\nBusiness Value\n[Explain the business impact]',
      labels: ['feature', 'enhancement']
    },
    {
      name: 'Technical Task',
      type: 'Task',
      template: 'Task Description\n[Describe the technical task]\n\nTechnical Requirements\n- Requirement 1\n- Requirement 2\n\nImplementation Notes\n[Any technical considerations]\n\nDefinition of Done\n- [ ] Code implemented\n- [ ] Tests written\n- [ ] Documentation updated\n- [ ] Code reviewed',
      labels: ['technical', 'backend']
    },
    {
      name: 'Hotfix',
      type: 'Bug',
      template: 'Critical Issue\n[Describe the production issue]\n\nImpact\n- Affected users: [number/percentage]\n- Business impact: [description]\n\nRoot Cause\n[If known]\n\nFix\n[Proposed solution]\n\nRollback Plan\n[How to rollback if needed]',
      labels: ['hotfix', 'production', 'urgent']
    }
  ];

  const ticketTypes = [
    { value: 'Task', icon: CheckSquare, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { value: 'Story', icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { value: 'Bug', icon: Bug, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    { value: 'Spike', icon: Zap, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { value: 'Epic', icon: Upload, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' }
  ];

  const jiraTerms = [
    'acceptance criteria', 'user story', 'epic', 'sprint', 'backlog',
    'story points', 'definition of done', 'scrum master', 'product owner',
    'retrospective', 'daily standup', 'burndown chart', 'velocity',
    'technical debt', 'code review', 'merge request', 'pull request',
    'deployment', 'staging environment', 'production', 'hotfix'
  ];

  const contextHelp = {
    description: {
      title: "Description / Context",
      tips: [
        "Start with the problem or opportunity",
        "Include who is affected (users, team, stakeholders)", 
        "Mention current vs. desired behavior",
        "Reference related tickets or documentation",
        "Include business impact or value"
      ]
    },
    title: {
      title: "Ticket Title",
      tips: [
        "Start with an action verb (Fix, Add, Update, Remove)",
        "Be specific but concise (under 10 words)",
        "Include the component/area affected",
        "Avoid jargon or internal abbreviations",
        "Make it scannable in ticket lists"
      ]
    },
    labels: {
      title: "Labels",
      tips: [
        "Use consistent naming conventions",
        "Include component tags (frontend, backend, api)",
        "Add priority or urgency indicators",
        "Include technology stack labels",
        "Tag team or ownership labels"
      ]
    }
  };

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-save draft
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (ticketData.title || ticketData.description) {
        try {
          const draftData = JSON.stringify(ticketData);
          localStorage.setItem('ticketDraft', draftData);
          setDraftSaved(true);
          setTimeout(() => setDraftSaved(false), 2000);
        } catch (e) {
          console.error('Failed to save draft:', e);
        }
      }
    }, 1000);
    return () => clearTimeout(saveTimer);
  }, [ticketData]);

  // Calculate word count
  useEffect(() => {
    const text = `${ticketData.description} ${ticketData.title}`.trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [ticketData.title, ticketData.description]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'g':
            e.preventDefault();
            if (!isGenerating && ticketData.description) {
              generateTicket();
            }
            break;
          case 's':
            e.preventDefault();
            if (ticketData.title || ticketData.description) {
              try {
                localStorage.setItem('ticketDraft', JSON.stringify(ticketData));
                setDraftSaved(true);
                setTimeout(() => setDraftSaved(false), 2000);
              } catch (err) {
                console.error('Failed to save draft:', err);
              }
            }
            break;
          case 'k':
            e.preventDefault();
            setShowShortcuts(prev => !prev);
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ticketData, isGenerating]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateProgress = () => {
    let completed = 0;
    const total = 5;
    
    if (ticketData.title?.trim()) completed++;
    if (ticketData.description?.trim()) completed++;
    if (ticketData.type) completed++;
    if (ticketData.priority) completed++;
    if (ticketData.labels?.length > 0) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const insertMarkdown = (markdownType) => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value || '';
    const selectedText = text.substring(start, end);
    let newText = '';
    let cursorOffset = 0;

    switch(markdownType) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'codeblock':
        newText = `\`\`\`\n${selectedText || 'code block'}\n\`\`\``;
        cursorOffset = selectedText ? newText.length : 4;
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        cursorOffset = selectedText ? newText.length - 5 : 1;
        break;
      case 'ul':
        newText = `\n- ${selectedText || 'List item'}`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'ol':
        newText = `\n1. ${selectedText || 'List item'}`;
        cursorOffset = selectedText ? newText.length : 3;
        break;
      case 'quote':
        newText = `\n> ${selectedText || 'Quote'}`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'h3':
        newText = `\n### ${selectedText || 'Heading'}`;
        cursorOffset = selectedText ? newText.length : 4;
        break;
      case 'checkbox':
        newText = `\n- [ ] ${selectedText || 'Task'}`;
        cursorOffset = selectedText ? newText.length : 6;
        break;
      case 'table':
        newText = `\n| Column 1 | Column 2 |\n|----------|----------|\n| Data 1   | Data 2   |`;
        cursorOffset = 11;
        break;
    }

    const newValue = text.substring(0, start) + newText + text.substring(end);
    setTicketData({...ticketData, description: newValue});
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };

  const applyTemplate = (template) => {
    if (!template) return;
    
    setTicketData({
      ...ticketData,
      type: template.type || 'Task',
      description: template.template || '',
      labels: [...new Set([...ticketData.labels, ...(template.labels || [])])]
    });
  };

  const copyAsMarkdown = async () => {
    const ticketContent = editedTicket || generatedTicket;
    const markdown = `# ${ticketData.title || 'Untitled Ticket'}\n\n**Type:** ${ticketData.type}\n**Priority:** ${ticketData.priority}\n**Labels:** ${ticketData.labels.length > 0 ? ticketData.labels.join(', ') : 'None'}\n\n${ticketContent || ticketData.description}`;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy to clipboard. Please try selecting and copying manually.');
    }
  };

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem('ticketDraft');
      if (saved) {
        const parsed = JSON.parse(saved);
        setTicketData({
          title: parsed.title || '',
          description: parsed.description || '',
          type: parsed.type || 'Task',
          priority: parsed.priority || 'Medium',
          template: parsed.template || 'Basic',
          labels: parsed.labels || []
        });
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem('ticketDraft');
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
    setTicketData({
      title: '',
      description: '',
      type: 'Task',
      priority: 'Medium',
      template: 'Basic',
      labels: []
    });
  };

  const addLabel = (label) => {
    const trimmedLabel = label.trim().toLowerCase();
    if (trimmedLabel && !ticketData.labels.includes(trimmedLabel)) {
      const newLabels = [...ticketData.labels, trimmedLabel];
      setTicketData({
        ...ticketData,
        labels: newLabels
      });
      
      // Update recent labels
      try {
        const updatedRecent = [trimmedLabel, ...recentLabels.filter(l => l !== trimmedLabel)].slice(0, 10);
        setRecentLabels(updatedRecent);
        localStorage.setItem('recentLabels', JSON.stringify(updatedRecent));
      } catch (e) {
        console.error('Failed to save recent labels:', e);
      }
    }
    setLabelInput('');
  };

  const removeLabel = (labelToRemove) => {
    setTicketData({
      ...ticketData,
      labels: ticketData.labels.filter(label => label !== labelToRemove)
    });
  };

  const handleLabelInputKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (labelInput) {
        addLabel(labelInput);
      }
    }
  };

  const generateTitleFromDescription = async (description) => {
    if (!description?.trim() || !autoGenerateTitle) return;
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 50,
          messages: [
            {
              role: "user",
              content: `Generate a concise JIRA ticket title (max 8 words) for: "${description}". Return only the title.`
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const generatedTitle = data.content[0].text.trim();
        setTicketData(prev => ({ ...prev, title: generatedTitle }));
      }
    } catch (error) {
      console.log('Title generation failed');
    }
  };

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setTicketData({...ticketData, description: newDescription});
    
    if (window.titleGenerationTimeout) {
      clearTimeout(window.titleGenerationTimeout);
    }
    window.titleGenerationTimeout = setTimeout(() => {
      if (newDescription.length > 20) {
        generateTitleFromDescription(newDescription);
      }
    }, 1000);
  };

  const copyToClipboard = async () => {
    const ticketContent = editedTicket || generatedTicket;
    try {
      await navigator.clipboard.writeText(ticketContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy to clipboard. Please try selecting and copying manually.');
    }
  };

  const generateTicket = async (regenerate = false) => {
    setIsGenerating(true);
    
    try {
      const content = regenerate && editedTicket 
        ? `Improve and refine this JIRA ticket while maintaining its core information:\n${editedTicket}`
        : `Generate a JIRA ticket with this info:
Title: ${ticketData.title || 'Untitled'}
Description: ${ticketData.description || 'No description'}
Template: ${ticketData.template}
Priority Level: ${ticketData.priority} (use this to determine urgency in content, but don't include as a field)
Labels context: ${ticketData.labels.join(', ') || 'None'} (use for context but don't list at top)

Create a well-structured ticket with the following format:
1. Start with the title as a ## heading
2. Add a "### Context" section with the background and current situation
3. Add a "### Expected Outcome" section that includes both the desired result AND specific success criteria as checkboxes (- [ ])
   - Integrate what would be acceptance criteria directly into the expected outcome
   - Use checkboxes for measurable/testable outcomes
   - Do NOT create a separate "Acceptance Criteria" section

${ticketData.template === 'Detailed' ? 'Use detailed template with comprehensive descriptions in each section.' : 'Use basic template with concise Context and Expected Outcome.'}
Return only the markdown-formatted ticket content.`;
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: content
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const generatedContent = data.content[0].text;
        setGeneratedTicket(generatedContent);
        setEditedTicket(generatedContent);
        setIsEditMode(false);
        
        if (autoCopy) {
          setTimeout(() => copyToClipboard(), 500);
        }
      }
    } catch (error) {
      console.error("Error generating ticket:", error);
      
      // Fallback ticket generation with merged format
      let ticket = `## ${ticketData.title || 'Untitled'}\n\n`;
      ticket += `### Context\n`;
      ticket += `${ticketData.description || 'No description provided'}\n\n`;
      ticket += `### Expected Outcome\n`;
      ticket += `The task should achieve the following results:\n\n`;
      ticket += `- [ ] Primary objective completed successfully\n`;
      ticket += `- [ ] All quality standards met\n`;
      ticket += `- [ ] Documentation updated as needed\n`;
      ticket += `- [ ] Solution tested and verified\n`;
      
      setGeneratedTicket(ticket);
      setEditedTicket(ticket);
      setIsEditMode(false);
    }
    
    setIsGenerating(false);
  };

  const refineTicket = async (style) => {
    // Check if there's a ticket to refine
    const currentTicket = editedTicket || generatedTicket;
    if (!currentTicket) return;
    
    setIsRefining(true);
    setActiveRefinement(style);
    
    const refinementPrompts = {
      'more-concise': `Take this JIRA ticket and make it 40-50% shorter. Remove any redundant words, combine similar points, and keep only essential information. Use bullet points instead of paragraphs where possible. Remove any explanatory text that isn't critical. Keep the Context and Expected Outcome structure but make each section brief and to the point.

Current ticket to make more concise:
${currentTicket}`,
      
      'bit-concise': `Take this JIRA ticket and make it about 20% shorter. Remove redundant phrases and unnecessary words while keeping all important information. Tighten up the language but don't lose any key details. Keep the Context and Expected Outcome structure.

Current ticket to slightly condense:
${currentTicket}`,
      
      'more-detailed': `Take this JIRA ticket and expand it significantly (make it 40-50% longer). Add more context, background information, technical specifications, edge cases, dependencies, risks, and more comprehensive success criteria. Be specific and thorough in all sections.

Current ticket to expand with details:
${currentTicket}`,
      
      'bit-detailed': `Take this JIRA ticket and add about 20% more detail. Clarify any vague points, add a few more success criteria, and provide slightly more context where helpful. Don't overdo it - just fill in gaps.

Current ticket to slightly expand:
${currentTicket}`,
      
      'technical': `Take this JIRA ticket and add significant technical implementation details. Include:
- Specific technologies, frameworks, or APIs involved
- Technical architecture considerations
- Database or data structure changes
- Performance requirements or constraints
- Security considerations
- Technical dependencies
- Implementation approach
Keep the Context and Expected Outcome structure but make it technically comprehensive.

Current ticket to make technical:
${currentTicket}`,
      
      'business': `Take this JIRA ticket and rewrite it with a strong business focus. Include:
- Clear business value and ROI
- Impact on users/customers
- Business metrics that will improve
- Cost savings or revenue impact
- Strategic alignment
- Stakeholder benefits
Frame everything in terms of business outcomes rather than technical tasks.

Current ticket to add business focus:
${currentTicket}`
    };

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2500,
          messages: [
            {
              role: "user",
              content: `${refinementPrompts[style]}

CRITICAL INSTRUCTIONS:
1. Maintain the exact format: Title (##), Context section (###), Expected Outcome section (###)
2. The Expected Outcome MUST include checkboxes (- [ ]) for measurable criteria
3. Do NOT add any other sections like Acceptance Criteria
4. Apply the refinement exactly as requested - if making concise, actually reduce length; if adding detail, actually expand
5. Return ONLY the refined ticket content, no explanations`
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const refinedContent = data.content[0].text.trim();
        setGeneratedTicket(refinedContent);
        setEditedTicket(refinedContent);
        setIsEditMode(false);
        
        if (autoCopy) {
          setTimeout(() => copyToClipboard(), 500);
        }
      } else {
        console.error("API response not ok:", response.status);
        alert("Failed to refine ticket. Please try again.");
      }
    } catch (error) {
      console.error("Error refining ticket:", error);
      alert("Failed to refine ticket. Please check your connection and try again.");
    }
    
    setIsRefining(false);
    setActiveRefinement(null);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${
      isDarkMode 
        ? 'from-slate-900 via-blue-900 to-slate-900' 
        : 'from-blue-50 via-cyan-50 to-blue-100'
    } relative overflow-hidden`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 opacity-10 rounded-full blur-3xl transform rotate-12"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500 to-cyan-600 opacity-10 rounded-full blur-3xl transform -rotate-12"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className={`${
            isDarkMode 
              ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50' 
              : 'bg-white/20 backdrop-blur-xl border-white/30'
          } rounded-3xl p-8 shadow-2xl border`}>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className={`text-5xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>JIRA Ticket Creator</h1>
                <p className={`text-lg ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Generate professionally structured JIRA tickets with AI assistance
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className={`w-32 rounded-full h-3 ${
                  isDarkMode 
                    ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50' 
                    : 'bg-white/20 backdrop-blur-xl border-white/30'
                } border shadow-inner`}>
                  <div 
                    className="h-3 rounded-full transition-all duration-500 shadow-lg bg-gradient-to-r from-blue-600 to-blue-700"
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
                <span className={`font-medium text-sm ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {calculateProgress()}% Complete
                </span>
              </div>
            </div>
          </div>

          {copySuccess && (
            <div className="fixed top-6 right-6 backdrop-blur-xl text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce z-50 border bg-gradient-to-r from-emerald-500 to-green-600">
              <CheckSquare className="w-6 h-6" />
              <span className="font-medium">Copied to clipboard!</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Panel */}
          <div className={`${
            isDarkMode 
              ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50' 
              : 'bg-white/20 backdrop-blur-xl border-white/30'
          } rounded-2xl shadow-2xl border p-8 space-y-8`}>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Create Ticket
            </h2>

            {/* Description with Markdown Toolbar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={`text-sm font-semibold ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  Description
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {ticketData.description.length} chars • {wordCount} words
                  </span>
                  {draftSaved && (
                    <span className="text-xs text-emerald-500 flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      Saved
                    </span>
                  )}
                </div>
              </div>
              
              {/* Markdown Toolbar */}
              <div className={`flex flex-wrap items-center gap-1 p-2 mb-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50' 
                  : 'bg-white/20 backdrop-blur-xl border-white/30'
              }`}>
                <button
                  onClick={() => insertMarkdown('bold')}
                  className={`p-1.5 rounded hover:bg-slate-700/30 transition-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertMarkdown('italic')}
                  className={`p-1.5 rounded hover:bg-slate-700/30 transition-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertMarkdown('code')}
                  className={`p-1.5 rounded hover:bg-slate-700/30 transition-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                  title="Code"
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertMarkdown('h3')}
                  className={`p-1.5 rounded hover:bg-slate-700/30 transition-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                  title="Heading"
                >
                  <Hash className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertMarkdown('ul')}
                  className={`p-1.5 rounded hover:bg-slate-700/30 transition-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                  title="List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertMarkdown('checkbox')}
                  className={`p-1.5 rounded hover:bg-slate-700/30 transition-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                  title="Checkbox"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertMarkdown('link')}
                  className={`p-1.5 rounded hover:bg-slate-700/30 transition-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                  title="Link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={loadDraft}
                    className={`px-2 py-1 text-xs rounded hover:bg-slate-700/30 transition-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                    title="Load Draft"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearDraft}
                    className={`px-2 py-1 text-xs rounded hover:bg-slate-700/30 transition-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              <textarea
                ref={descriptionRef}
                value={ticketData.description}
                onChange={handleDescriptionChange}
                placeholder="Describe the problem, feature request, or task..."
                rows={5}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  isDarkMode 
                    ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50 text-white placeholder-slate-400' 
                    : 'bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500'
                } resize-none font-mono text-sm`}
              />
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={`text-sm font-semibold ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  Title {autoGenerateTitle && <span className="text-blue-500 text-xs">(auto-generated)</span>}
                </label>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {ticketData.title.length}/100
                </span>
              </div>
              <input
                type="text"
                value={ticketData.title}
                onChange={(e) => setTicketData({...ticketData, title: e.target.value})}
                placeholder={autoGenerateTitle ? "Auto-generated from description..." : "e.g., Fix user login timeout"}
                maxLength={100}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  isDarkMode 
                    ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50 text-white placeholder-slate-400' 
                    : 'bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500'
                }`}
              />
            </div>

            {/* Type Selection */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Ticket Type
              </label>
              <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
                {ticketTypes.map(type => {
                  const Icon = type.icon;
                  const isSelected = ticketData.type === type.value;
                  const getTypeColor = () => {
                    switch(type.value) {
                      case 'Task': return 'blue';
                      case 'Story': return 'green';
                      case 'Bug': return 'red';
                      case 'Spike': return 'purple';
                      case 'Epic': return 'orange';
                      default: return 'blue';
                    }
                  };
                  const color = getTypeColor();
                  
                  return (
                    <button
                      key={type.value}
                      onClick={() => setTicketData({...ticketData, type: type.value})}
                      className={`px-3 py-3 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
                        isSelected 
                          ? type.value === 'Task'
                            ? isDarkMode ? 'bg-blue-600/30 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20' : 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg shadow-blue-500/20'
                            : type.value === 'Story'
                            ? isDarkMode ? 'bg-green-600/30 border-green-500 text-green-400 shadow-lg shadow-green-500/20' : 'bg-green-100 border-green-500 text-green-700 shadow-lg shadow-green-500/20'
                            : type.value === 'Bug'
                            ? isDarkMode ? 'bg-red-600/30 border-red-500 text-red-400 shadow-lg shadow-red-500/20' : 'bg-red-100 border-red-500 text-red-700 shadow-lg shadow-red-500/20'
                            : type.value === 'Spike'
                            ? isDarkMode ? 'bg-purple-600/30 border-purple-500 text-purple-400 shadow-lg shadow-purple-500/20' : 'bg-purple-100 border-purple-500 text-purple-700 shadow-lg shadow-purple-500/20'
                            : isDarkMode ? 'bg-orange-600/30 border-orange-500 text-orange-400 shadow-lg shadow-orange-500/20' : 'bg-orange-100 border-orange-500 text-orange-700 shadow-lg shadow-orange-500/20'
                          : isDarkMode 
                            ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-700/30'
                            : 'bg-white/20 border-white/30 text-slate-600 hover:border-white/50 hover:bg-white/30'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{type.value}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Selection */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Priority
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Low', icon: TrendingUp, color: 'green' },
                  { name: 'Medium', icon: AlertCircle, color: 'yellow' },
                  { name: 'High', icon: AlertTriangle, color: 'orange' },
                  { name: 'Critical', icon: Flame, color: 'red' }
                ].map(priority => {
                  const Icon = priority.icon;
                  const isSelected = ticketData.priority === priority.name;
                  
                  return (
                    <button
                      key={priority.name}
                      onClick={() => setTicketData({...ticketData, priority: priority.name})}
                      className={`px-4 py-2 rounded-xl border-2 transition-all duration-200 flex items-center gap-2 ${
                        isSelected 
                          ? priority.name === 'Low' 
                            ? isDarkMode ? 'bg-green-600/30 border-green-500 text-green-400 shadow-lg shadow-green-500/20' : 'bg-green-100 border-green-500 text-green-700 shadow-lg shadow-green-500/20'
                            : priority.name === 'Medium'
                            ? isDarkMode ? 'bg-yellow-600/30 border-yellow-500 text-yellow-400 shadow-lg shadow-yellow-500/20' : 'bg-yellow-100 border-yellow-500 text-yellow-700 shadow-lg shadow-yellow-500/20'
                            : priority.name === 'High'
                            ? isDarkMode ? 'bg-orange-600/30 border-orange-500 text-orange-400 shadow-lg shadow-orange-500/20' : 'bg-orange-100 border-orange-500 text-orange-700 shadow-lg shadow-orange-500/20'
                            : isDarkMode ? 'bg-red-600/30 border-red-500 text-red-400 shadow-lg shadow-red-500/20' : 'bg-red-100 border-red-500 text-red-700 shadow-lg shadow-red-500/20'
                          : isDarkMode 
                            ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:border-slate-600'
                            : 'bg-white/20 border-white/30 text-slate-600 hover:border-white/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{priority.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Style Selection */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Template Style
              </label>
              <div className="flex gap-2">
                {[
                  { name: 'Basic', icon: Layout, description: 'Simple & concise' },
                  { name: 'Detailed', icon: LayoutGrid, description: 'Comprehensive details' }
                ].map(template => {
                  const Icon = template.icon;
                  const isSelected = ticketData.template === template.name;
                  return (
                    <button
                      key={template.name}
                      onClick={() => setTicketData({...ticketData, template: template.name})}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        isSelected 
                          ? isDarkMode
                            ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                            : 'bg-purple-100 border-purple-500 text-purple-700 shadow-lg shadow-purple-500/20'
                          : isDarkMode 
                            ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:border-slate-600'
                            : 'bg-white/20 border-white/30 text-slate-600 hover:border-white/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold text-sm">{template.name}</div>
                          <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {template.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Labels
              </label>
              
              {ticketData.labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {ticketData.labels.map((label, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        isDarkMode 
                          ? 'bg-slate-800/30 border-slate-700/50 text-white' 
                          : 'bg-white/30 border-white/30 text-slate-800'
                      } border`}
                    >
                      {label}
                      <button
                        onClick={() => removeLabel(label)}
                        className="ml-2 hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyPress={handleLabelInputKeyPress}
                  placeholder="Add label (press Enter)"
                  className={`flex-1 px-4 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50 text-white placeholder-slate-400' 
                      : 'bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500'
                  }`}
                />
                <button
                  onClick={() => addLabel(labelInput)}
                  disabled={!labelInput?.trim()}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all border ${
                    isDarkMode 
                      ? 'bg-slate-800/20 border-slate-700/50 text-white hover:bg-slate-700/30' 
                      : 'bg-white/20 border-white/30 text-slate-800 hover:bg-white/30'
                  } disabled:opacity-50`}
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {commonLabels.filter(label => !ticketData.labels.includes(label)).slice(0, 8).map((label) => (
                  <button
                    key={label}
                    onClick={() => addLabel(label)}
                    className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                      isDarkMode 
                        ? 'bg-slate-800/20 border-slate-700/50 text-slate-400 hover:text-white' 
                        : 'bg-white/20 border-white/30 text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateTicket}
              disabled={isGenerating || !ticketData.description}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-lg shadow-xl transition-all"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-6 h-6" />
                  Generate Ticket
                </>
              )}
            </button>
          </div>

          {/* Right Panel */}
          <div className={`${
            isDarkMode 
              ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50' 
              : 'bg-white/20 backdrop-blur-xl border-white/30'
          } rounded-2xl shadow-2xl border p-8`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Generated Ticket
              </h2>
              {generatedTicket && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`${
                      isEditMode 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-slate-600 hover:bg-slate-700'
                    } text-white py-2 px-4 rounded-xl flex items-center gap-2 transition-all`}
                  >
                    <Edit className="w-4 h-4" />
                    {isEditMode ? 'Editing' : 'Edit'}
                  </button>
                  <button
                    onClick={() => generateTicket(true)}
                    disabled={isGenerating || !editedTicket}
                    className={`bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isGenerating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Regenerate
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className={`${copySuccess ? 'bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white py-2 px-4 rounded-xl flex items-center gap-2 transition-all`}
                  >
                    <Copy className="w-4 h-4" />
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={copyAsMarkdown}
                    className={`py-2 px-4 rounded-xl flex items-center gap-2 border ${
                      isDarkMode 
                        ? 'bg-slate-700/30 text-slate-300 border-slate-600' 
                        : 'bg-white/30 text-slate-700 border-white/50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Markdown
                  </button>
                </div>
              )}
            </div>

            {generatedTicket ? (
              <>
                <div className={`rounded-xl border ${
                  isDarkMode 
                    ? 'bg-slate-800/20 border-slate-700/50' 
                    : 'bg-white/20 border-white/30'
                }`}>
                  {isEditMode ? (
                    <textarea
                      value={editedTicket}
                      onChange={(e) => setEditedTicket(e.target.value)}
                      className={`w-full p-6 text-sm whitespace-pre-wrap font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode 
                          ? 'bg-slate-800/40 text-white' 
                          : 'bg-white/40 text-slate-800'
                      } resize-none`}
                      rows={20}
                      placeholder="Edit your ticket here..."
                    />
                  ) : (
                    <pre className={`p-6 text-sm whitespace-pre-wrap font-mono ${
                      isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>
                      {editedTicket || generatedTicket}
                    </pre>
                  )}
                </div>
                
                {/* Refinement Options */}
                <div className={`mt-4 p-4 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-slate-800/20 border-slate-700/50' 
                    : 'bg-white/20 border-white/30'
                }`}>
                  <label className={`block text-sm font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    Refine Ticket
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => refineTicket('concise')}
                      disabled={isRefining}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        isDarkMode 
                          ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:bg-slate-700/30' 
                          : 'bg-white/20 border-white/30 text-slate-600 hover:bg-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isRefining ? '...' : 'More Concise'}
                    </button>
                    <button
                      onClick={() => refineTicket('detailed')}
                      disabled={isRefining}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        isDarkMode 
                          ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:bg-slate-700/30' 
                          : 'bg-white/20 border-white/30 text-slate-600 hover:bg-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isRefining ? '...' : 'More Details'}
                    </button>
                    <button
                      onClick={() => refineTicket('technical')}
                      disabled={isRefining}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        isDarkMode 
                          ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:bg-slate-700/30' 
                          : 'bg-white/20 border-white/30 text-slate-600 hover:bg-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isRefining ? '...' : 'More Technical'}
                    </button>
                    <button
                      onClick={() => refineTicket('business')}
                      disabled={isRefining}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        isDarkMode 
                          ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:bg-slate-700/30' 
                          : 'bg-white/20 border-white/30 text-slate-600 hover:bg-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isRefining ? '...' : 'Business Focus'}
                    </button>
                    <button
                      onClick={() => refineTicket('user-story')}
                      disabled={isRefining}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        isDarkMode 
                          ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:bg-slate-700/30' 
                          : 'bg-white/20 border-white/30 text-slate-600 hover:bg-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isRefining ? '...' : 'User Story'}
                    </button>
                    <button
                      onClick={() => refineTicket('acceptance')}
                      disabled={isRefining}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        isDarkMode 
                          ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:bg-slate-700/30' 
                          : 'bg-white/20 border-white/30 text-slate-600 hover:bg-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isRefining ? '...' : 'More Criteria'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={`${
                isDarkMode 
                  ? 'bg-slate-800/20 border-slate-700/50' 
                  : 'bg-white/20 border-white/30'
              } rounded-xl p-12 text-center border-2 border-dashed`}>
                <FileText className={`w-16 h-16 mx-auto mb-4 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`} />
                <h3 className={`text-lg font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>No ticket generated yet</h3>
                <p className={`${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Fill in the details and click "Generate Ticket"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700' 
              : 'bg-white border-slate-200'
          } rounded-xl p-6 max-w-md w-full border shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className={`p-1 rounded hover:bg-slate-700/30 transition-all ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <kbd className={`px-3 py-1 rounded text-sm font-mono ${
                  isDarkMode 
                    ? 'bg-slate-700 text-slate-300 border border-slate-600' 
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  Ctrl + G
                </kbd>
                <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Generate ticket
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <kbd className={`px-3 py-1 rounded text-sm font-mono ${
                  isDarkMode 
                    ? 'bg-slate-700 text-slate-300 border border-slate-600' 
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  Ctrl + S
                </kbd>
                <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Save draft
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <kbd className={`px-3 py-1 rounded text-sm font-mono ${
                  isDarkMode 
                    ? 'bg-slate-700 text-slate-300 border border-slate-600' 
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  Ctrl + K
                </kbd>
                <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Show shortcuts
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JiraTicketCreator;