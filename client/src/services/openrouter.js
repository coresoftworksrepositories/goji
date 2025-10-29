import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const modelChoice = import.meta.env.VITE_OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

class OpenRouterService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    this.enabled = import.meta.env.VITE_OPENROUTER_ENABLED === 'true';
  }

  isEnabled() {
    return this.enabled && this.apiKey && this.apiKey !== 'your_openrouter_api_key_here';
  }

  async isEnabledForTeam(teamId) {
    try {
      if (!this.isEnabled()) {
        return false;
      }
      // Then check if the team has AI features enabled
      const { authService } = await import('./auth.js');
      const teamAiSettings = await authService.getTeamAiSettings(teamId);
      return teamAiSettings.enabled === true;
    } catch (error) {
      console.error('Error checking team AI settings:', error);
      // Default to disabled if we can't check team settings
      return false;
    }
  }

  async generateTodos(storyTitle, storyDescription, teamId = null) {
    if (!this.isEnabled()) {
      throw new Error('OpenRouter is not enabled or API key is not set');
    }

    // Check team-specific settings if teamId is provided
    if (teamId && !(await this.isEnabledForTeam(teamId))) {
      throw new Error('AI ticket generation is disabled for this team');
    }

    const prompt = `Based on the following user story, generate a list of specific, actionable todo items that would be needed to implement this story. Each todo should be clear, concise, and represent a discrete task that could become a ticket.

Story Title: ${storyTitle}
Story Description: ${storyDescription || 'No description provided'}

Generate 3-7 todo items in JSON format. Each todo should have:
- title: A brief, actionable task title (5-8 words)
- description: A detailed description of what needs to be done
- type: The type of task (TASK, BUG, IMPROVEMENT, or RESEARCH)
- priority: Priority level (LOW, MEDIUM, HIGH, CRITICAL)
- estimatedHours: Estimated time in hours (1-24)

Respond with valid JSON only, in this format:
{
  "todos": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "type": "TASK",
      "priority": "MEDIUM",
      "estimatedHours": 4
    }
  ]
}`;

    try {
      const response = await axios.post(
        `${OPENROUTER_API_URL}/chat/completions`,
        {
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Goji Project Management'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      // Try to parse the JSON response
      try {
        const parsed = JSON.parse(content);
        if (parsed.todos && Array.isArray(parsed.todos)) {
          return parsed.todos;
        } else {
          throw new Error('Invalid response format');
        }
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.todos && Array.isArray(parsed.todos)) {
            return parsed.todos;
          }
        }
        throw new Error('Could not parse AI response as valid JSON');
      }
    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      if (error.response) {
        throw new Error(`OpenRouter API error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
      } else if (error.request) {
        throw new Error('Network error: Could not reach OpenRouter API');
      } else {
        throw error;
      }
    }
  }
}

export const openRouterService = new OpenRouterService();