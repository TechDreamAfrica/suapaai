import { auth } from './firebase.js';

import config from './config.js';

// DOM Elements
const companionTools = document.querySelectorAll('.companion-tool');
const companionToolArea = document.getElementById('companion-tool-area');
const companionToolTitle = document.getElementById('companion-tool-title');
const companionToolContent = document.getElementById('companion-tool-content');
const closeCompanionTool = document.getElementById('close-companion-tool');

// AI API Configuration - Loaded from environment variables
const OPENAI_API_KEY = config.ai.openaiApiKey;
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// AI Helper Function
async function getAIResponse(prompt, systemContext = '') {
    if (!OPENAI_API_KEY) {
        console.error('OpenAI API key not configured');
        return null;
    }

    try {
        const response = await fetch(OPENAI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemContext || 'You are a helpful educational assistant for students in Ghana following the GES curriculum.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            console.error('OpenAI API error:', response.status);
            return null;
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || null;
    } catch (error) {
        console.error('AI API Error:', error);
        return null;
    }
}

// Tool configurations
const tools = {
    assignment: {
        title: 'Assignment Helper',
        icon: 'fas fa-file-alt',
        color: 'from-green-500 to-green-600'
    },
    writer: {
        title: 'Content Writer',
        icon: 'fas fa-pen',
        color: 'from-blue-500 to-blue-600'
    },
    explainer: {
        title: 'Explainer',
        icon: 'fas fa-lightbulb',
        color: 'from-yellow-500 to-yellow-600'
    },
    adaptive: {
        title: 'Adaptive Learning',
        icon: 'fas fa-chart-line',
        color: 'from-purple-500 to-purple-600'
    },
    reference: {
        title: 'Subject Reference',
        icon: 'fas fa-book',
        color: 'from-red-500 to-red-600'
    }
};

// GES Curriculum subjects
const GES_SUBJECTS = [
    'Mathematics',
    'English Language',
    'Integrated Science',
    'Social Studies',
    'Computing',
    'French',
    'Ghanaian Language',
    'Creative Arts',
    'Religious & Moral Education',
    'Physical Education'
];

// Initialize companion tools
function initializeCompanion() {
    // Open tool buttons
    if (companionTools.length > 0) {
        companionTools.forEach(button => {
            button.addEventListener('click', () => {
                const toolType = button.dataset.tool;
                openTool(toolType);
            });
        });
    }

    // Close tool button
    if (closeCompanionTool) {
        closeCompanionTool.addEventListener('click', () => {
            if (companionToolArea) {
                companionToolArea.classList.add('hidden');
            }
        });
    }

    // Handle tool cards (alternative UI)
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
        card.addEventListener('click', () => {
            const tool = card.getAttribute('data-tool');
            openTool(tool);
        });
    });
}

// Open tool function
function openTool(toolType) {
    const tool = tools[toolType];

    if (!tool) {
        console.error('Unknown tool type:', toolType);
        return;
    }

    // Check if we have the modern UI with tool area
    if (companionToolArea && companionToolTitle && companionToolContent) {
        companionToolTitle.textContent = tool.title;
        companionToolArea.classList.remove('hidden');

        // Render tool content
        switch (toolType) {
            case 'assignment':
                renderAssignmentHelper();
                break;
            case 'writer':
                renderContentWriter();
                break;
            case 'explainer':
                renderExplainer();
                break;
            case 'adaptive':
                renderAdaptiveLearning();
                break;
            case 'reference':
                renderSubjectReference();
                break;
        }
    } else {
        // Fallback for simple UI
        showToolModal(tool);
    }
}

// Fallback modal for simple UI
function showToolModal(tool) {
    if (window.PWA) {
        window.PWA.showToast(`${tool.title} - Feature available in full view`, 'info');
    }
}

// Assignment Helper
function renderAssignmentHelper() {
    companionToolContent.innerHTML = `
        <form id="assignment-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                <select id="assignment-subject" required
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
                    <option value="">Select a subject</option>
                    ${GES_SUBJECTS.map(subject => `<option value="${subject}">${subject}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assignment Topic</label>
                <input type="text" id="assignment-topic" required
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder="e.g., Photosynthesis, Quadratic Equations">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What do you need help with?</label>
                <textarea id="assignment-description" required rows="4"
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder="Describe what you need help with..."></textarea>
            </div>
            <button type="submit"
                class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition">
                <i class="fas fa-magic mr-2"></i> Get Help
            </button>
        </form>
        <div id="assignment-result" class="mt-6 hidden"></div>
    `;

    document.getElementById('assignment-form').addEventListener('submit', handleAssignmentSubmit);
}

// Content Writer
function renderContentWriter() {
    companionToolContent.innerHTML = `
        <form id="writer-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Type</label>
                <select id="writer-type" required
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                    <option value="notes">Study Notes</option>
                    <option value="essay">Essay</option>
                    <option value="summary">Summary</option>
                    <option value="report">Report</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic</label>
                <input type="text" id="writer-topic" required
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Enter your topic">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Points (optional)</label>
                <textarea id="writer-points" rows="3"
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Enter key points to include (one per line)"></textarea>
            </div>
            <button type="submit"
                class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition">
                <i class="fas fa-pen-fancy mr-2"></i> Generate Content
            </button>
        </form>
        <div id="writer-result" class="mt-6 hidden"></div>
    `;

    document.getElementById('writer-form').addEventListener('submit', handleWriterSubmit);
}

// Explainer
function renderExplainer() {
    companionToolContent.innerHTML = `
        <form id="explainer-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                <select id="explainer-subject" required
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition">
                    <option value="">Select a subject</option>
                    ${GES_SUBJECTS.map(subject => `<option value="${subject}">${subject}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Concept to Explain</label>
                <input type="text" id="explainer-concept" required
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                    placeholder="e.g., How does gravity work?">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Detail Level</label>
                <select id="explainer-level" required
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition">
                    <option value="simple">Simple (Primary School)</option>
                    <option value="intermediate">Intermediate (JHS)</option>
                    <option value="advanced">Advanced (SHS)</option>
                </select>
            </div>
            <button type="submit"
                class="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition">
                <i class="fas fa-question-circle mr-2"></i> Explain
            </button>
        </form>
        <div id="explainer-result" class="mt-6 hidden"></div>
    `;

    document.getElementById('explainer-form').addEventListener('submit', handleExplainerSubmit);
}

// Adaptive Learning
function renderAdaptiveLearning() {
    companionToolContent.innerHTML = `
        <div class="space-y-6">
            <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    <i class="fas fa-info-circle mr-2"></i> Your Learning Path
                </h4>
                <p class="text-sm text-blue-700 dark:text-blue-300">
                    Track your progress and get personalized recommendations based on your performance.
                </p>
            </div>

            <div class="grid md:grid-cols-2 gap-4">
                <div class="bg-white dark:bg-gray-700 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600">
                    <h5 class="font-semibold text-gray-800 dark:text-white mb-2">Subjects Mastered</h5>
                    <div class="text-3xl font-bold text-purple-600">0</div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Keep learning!</p>
                </div>

                <div class="bg-white dark:bg-gray-700 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600">
                    <h5 class="font-semibold text-gray-800 dark:text-white mb-2">Study Hours</h5>
                    <div class="text-3xl font-bold text-purple-600">0</div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">This week</p>
                </div>
            </div>

            <div>
                <h4 class="font-semibold text-gray-800 dark:text-white mb-3">Recommended Topics</h4>
                <div class="space-y-2">
                    ${GES_SUBJECTS.slice(0, 5).map(subject => `
                        <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                            <span class="text-gray-800 dark:text-white">${subject}</span>
                            <button class="text-purple-600 dark:text-purple-400 hover:underline text-sm">
                                Start Learning →
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Subject Reference
function renderSubjectReference() {
    companionToolContent.innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Subject</label>
                <select id="reference-subject"
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
                    <option value="">Choose a subject...</option>
                    ${GES_SUBJECTS.map(subject => `<option value="${subject}">${subject}</option>`).join('')}
                </select>
            </div>
            <div id="reference-content" class="mt-6"></div>
        </div>
    `;

    document.getElementById('reference-subject').addEventListener('change', (e) => {
        handleReferenceChange(e.target.value);
    });
}

// Form Handlers with AI Integration
async function handleAssignmentSubmit(e) {
    e.preventDefault();

    const subject = document.getElementById('assignment-subject').value;
    const topic = document.getElementById('assignment-topic').value;
    const description = document.getElementById('assignment-description').value;

    const resultDiv = document.getElementById('assignment-result');
    resultDiv.innerHTML = `
        <div class="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
            <div class="animate-pulse flex items-center gap-2">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Generating assignment help with AI...</span>
            </div>
        </div>
    `;
    resultDiv.classList.remove('hidden');

    const prompt = `Subject: ${subject}
Topic: ${topic}
Student needs help with: ${description}

Provide detailed assignment help including:
1. A suggested outline
2. Key points to cover
3. Real-world examples relevant to Ghanaian students
4. Tips for completing the assignment

Format your response clearly with sections.`;

    const systemContext = 'You are an educational assistant for Ghana Education Service (GES) curriculum. Help students with their assignments by providing structured guidance.';

    const aiResponse = await getAIResponse(prompt, systemContext);

    if (aiResponse) {
        resultDiv.innerHTML = `
            <div class="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 class="font-semibold text-gray-800 dark:text-white mb-4">
                    <i class="fas fa-magic text-green-600 mr-2"></i>
                    Assignment Help: ${topic}
                </h4>
                <div class="space-y-3 text-gray-700 dark:text-gray-300">
                    <p><strong>Subject:</strong> ${subject}</p>
                    <div class="whitespace-pre-wrap mt-4">${aiResponse}</div>
                </div>
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900 p-4 rounded-lg text-red-700 dark:text-red-300">
                <i class="fas fa-exclamation-circle mr-2"></i>
                AI is not available. Check your OpenAI API key configuration.
            </div>
        `;
    }
}

async function handleWriterSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('writer-type').value;
    const topic = document.getElementById('writer-topic').value;
    const points = document.getElementById('writer-points').value;

    const resultDiv = document.getElementById('writer-result');
    resultDiv.innerHTML = `
        <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <div class="animate-pulse flex items-center gap-2">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Generating content with AI...</span>
            </div>
        </div>
    `;
    resultDiv.classList.remove('hidden');

    const prompt = `Generate ${type} about: ${topic}
${points ? `Include these key points:\n${points}` : ''}

Make it educational, well-structured, and relevant to Ghanaian students following the GES curriculum.`;

    const systemContext = 'You are an educational content writer for Ghana Education Service (GES) curriculum. Create high-quality study materials for students.';

    const aiResponse = await getAIResponse(prompt, systemContext);

    if (aiResponse) {
        resultDiv.innerHTML = `
            <div class="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="font-semibold text-gray-800 dark:text-white">
                        <i class="fas fa-magic text-blue-600 mr-2"></i>
                        Generated ${type}
                    </h4>
                    <button onclick="copyContent()" class="text-blue-600 hover:text-blue-700 text-sm">
                        <i class="fas fa-copy mr-1"></i> Copy
                    </button>
                </div>
                <div id="generated-content" class="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
${aiResponse}
                </div>
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900 p-4 rounded-lg text-red-700 dark:text-red-300">
                <i class="fas fa-exclamation-circle mr-2"></i>
                AI is not available. Check your OpenAI API key configuration.
            </div>
        `;
    }
}

async function handleExplainerSubmit(e) {
    e.preventDefault();

    const subject = document.getElementById('explainer-subject').value;
    const concept = document.getElementById('explainer-concept').value;
    const level = document.getElementById('explainer-level').value;

    const resultDiv = document.getElementById('explainer-result');
    resultDiv.innerHTML = `
        <div class="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
            <div class="animate-pulse flex items-center gap-2">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Preparing explanation...</span>
            </div>
        </div>
    `;
    resultDiv.classList.remove('hidden');

    const levelMap = {
        simple: 'Primary School level',
        intermediate: 'Junior High School level',
        advanced: 'Senior High School level'
    };

    const prompt = `Subject: ${subject}
Concept to explain: ${concept}
Education level: ${levelMap[level]}

Provide a clear, detailed explanation suitable for ${levelMap[level]} students in Ghana.
Include:
1. A clear definition
2. Step-by-step explanation
3. Real-world examples relevant to Ghanaian students
4. Key takeaways`;

    const systemContext = 'You are an educational explainer for Ghana Education Service (GES) curriculum. Break down complex concepts into easy-to-understand explanations.';

    const aiResponse = await getAIResponse(prompt, systemContext);

    if (aiResponse) {
        resultDiv.innerHTML = `
            <div class="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 class="font-semibold text-gray-800 dark:text-white mb-4">
                    <i class="fas fa-magic text-yellow-600 mr-2"></i>
                    ${concept}
                </h4>
                <div class="space-y-3 text-gray-700 dark:text-gray-300">
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Level:</strong> ${levelMap[level]}</p>
                    <div class="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg mt-4">
                        <div class="whitespace-pre-wrap">${aiResponse}</div>
                    </div>
                </div>
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900 p-4 rounded-lg text-red-700 dark:text-red-300">
                <i class="fas fa-exclamation-circle mr-2"></i>
                AI is not available. Check your OpenAI API key configuration.
            </div>
        `;
    }
}

function handleReferenceChange(subject) {
    const contentDiv = document.getElementById('reference-content');

    if (!subject) {
        contentDiv.innerHTML = '';
        return;
    }

    const referenceData = {
        'Mathematics': {
            topics: ['Algebra', 'Geometry', 'Statistics', 'Trigonometry', 'Calculus'],
            description: 'Core mathematical concepts for GES curriculum'
        },
        'English Language': {
            topics: ['Grammar', 'Comprehension', 'Essay Writing', 'Literature', 'Vocabulary'],
            description: 'English language skills and literature'
        },
        'Integrated Science': {
            topics: ['Biology', 'Chemistry', 'Physics', 'Environmental Science'],
            description: 'Scientific principles and applications'
        },
        'Social Studies': {
            topics: ['History of Ghana', 'Geography', 'Civics', 'Economics', 'Government'],
            description: 'Social sciences and Ghanaian studies'
        }
    };

    const data = referenceData[subject] || {
        topics: ['General Overview', 'Key Concepts', 'Study Tips'],
        description: 'Subject reference materials'
    };

    contentDiv.innerHTML = `
        <div class="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 class="font-semibold text-gray-800 dark:text-white mb-2">${subject}</h4>
            <p class="text-gray-600 dark:text-gray-400 mb-4">${data.description}</p>
            <div>
                <h5 class="font-semibold text-gray-800 dark:text-white mb-3">Topics:</h5>
                <div class="grid gap-2">
                    ${data.topics.map(topic => `
                        <button class="reference-topic-btn w-full bg-gray-50 dark:bg-gray-600 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-500 transition cursor-pointer text-left" data-subject="${subject}" data-topic="${topic}">
                            <i class="fas fa-book-open mr-2 text-red-600"></i>
                            ${topic}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div id="topic-explanation" class="mt-6 hidden"></div>
        </div>
    `;

    // Add click event listeners to topic buttons
    document.querySelectorAll('.reference-topic-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const subject = btn.getAttribute('data-subject');
            const topic = btn.getAttribute('data-topic');
            handleTopicClick(subject, topic);
        });
    });
}

// Handle topic click to generate AI explanation
async function handleTopicClick(subject, topic) {
    const explanationDiv = document.getElementById('topic-explanation');

    // Show loading state
    explanationDiv.innerHTML = `
        <div class="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
            <div class="animate-pulse flex items-center gap-2">
                <i class="fas fa-spinner fa-spin text-red-600"></i>
                <span class="text-red-700 dark:text-red-300">Generating explanation for ${topic}...</span>
            </div>
        </div>
    `;
    explanationDiv.classList.remove('hidden');

    const prompt = `Subject: ${subject}
Topic: ${topic}

Provide a comprehensive overview of this topic for Ghanaian students following the GES curriculum. Include:
1. Definition and key concepts
2. Important subtopics or areas to study
3. Real-world applications relevant to Ghana
4. Study tips and common misconceptions
5. Sample questions or practice ideas

Make it clear, engaging, and educational.`;

    const systemContext = 'You are an educational reference assistant for Ghana Education Service (GES) curriculum. Provide comprehensive, well-structured subject explanations for students.';

    const aiResponse = await getAIResponse(prompt, systemContext);

    if (aiResponse) {
        explanationDiv.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900 p-6 rounded-lg border-l-4 border-red-600">
                <div class="flex items-start justify-between mb-4">
                    <h4 class="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                        <i class="fas fa-graduation-cap"></i>
                        ${topic} - ${subject}
                    </h4>
                    <button onclick="copyTopicContent()" class="text-red-600 dark:text-red-400 hover:underline text-sm">
                        <i class="fas fa-copy mr-1"></i>Copy
                    </button>
                </div>
                <div id="topic-content" class="text-red-900 dark:text-red-100 whitespace-pre-wrap">${aiResponse}</div>
            </div>
        `;
    } else {
        explanationDiv.innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 p-4 rounded-lg border border-red-300 dark:border-red-700">
                <p class="text-red-800 dark:text-red-200">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    AI explanation not available. Please configure your OpenAI API key.
                </p>
            </div>
        `;
    }
}

// Copy content function
window.copyContent = function() {
    const content = document.getElementById('generated-content')?.innerText;
    if (content) {
        navigator.clipboard.writeText(content).then(() => {
            if (window.PWA) {
                window.PWA.showToast('Content copied to clipboard!', 'success');
            } else {
                alert('Content copied to clipboard!');
            }
        });
    }
};

// Copy topic content function
window.copyTopicContent = function() {
    const content = document.getElementById('topic-content')?.innerText;
    if (content) {
        navigator.clipboard.writeText(content).then(() => {
            if (window.PWA) {
                window.PWA.showToast('Topic explanation copied to clipboard!', 'success');
            } else {
                alert('Topic explanation copied to clipboard!');
            }
        });
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCompanion);
} else {
    initializeCompanion();
}

// Export for testing and use in other modules
export {
    openTool,
    renderAssignmentHelper,
    renderContentWriter,
    renderExplainer,
    initializeCompanion
};
