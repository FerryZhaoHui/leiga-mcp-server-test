# Leiga MCP Server

A [Model Context Protocol](https://github.com/modelcontextprotocol) server for the [Leiga Open API](https://www.apidog.com/apidoc/shared/5a741107-c211-410f-880c-048d1917c984).

This server provides integration with Leiga's issue search system through MCP, allowing LLMs to interact with Leiga issues.

## Installation
### Manual Installation

1. Create or get a Personal API Keys for your team: [https://app.leiga.com/setting/api-key](https://app.leiga.com/setting/api-key)

2. Add server config to Cursor Desktop:

```json
{
  "mcpServers": {
    "leiga-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "leiga-mcp-server"
      ],
      "env":{
        "LEIGA_CLIENT_ID":"you client id",
        "LEIGA_SECRET":"you client secret"
      }
    }
  }
}
```

## Components

### Tools
1. **`search_all_issues`**: Search issues with flexible filtering
   - Optional inputs:
     - `query` (string): Text to search in title
     - `projectName` (string): Filter by project name
     - `status` (string): Filter by status type
     - `assignee` (string):Filter by assignee's username
     - `label` (string): Filter by label
     - `priority` (string): Filter by priority
     - `sprint` (string): Filter by sprint name
     - `workType` (string): Filter by issue work type name
     - `startAfterDate` (string): Filter issues that start AFTER or ON this date (YYYY-MM-DD format)
     - `startBeforeDate` (string): Filter issues that start BEFORE or ON this date (YYYY-MM-DD format)
     - `dueAfterDate` (string): Filter issues that are due AFTER or ON this date (YYYY-MM-DD format)
     - `dueBeforeDate` (string): Filter issues that are due BEFORE or ON this date (YYYY-MM-DD format)
     - `createdAfterDate` (string): Filter issues that were created AFTER or ON this date (YYYY-MM-DD format)
     - `createdBeforeDate` (string): Filter issues that were created BEFORE or ON this date (YYYY-MM-DD format)
     - `pageSize` (number, default: 10): Max results

2. **`get_issue_detail`**: Get issue detail by using issue ID or issue number.
   - Required inputs:
     - `issueId` (string): Issue ID or issue number

3. **`my_assigned_issues`**: Retrieves my issues, specifically those assigned to the authenticated user.
   - Optional inputs:
     - `query` (string): Text to search in title
     - `projectName` (string): Filter by project name
     - `status` (string): Filter by status type
     - `label` (string): Filter by label
     - `priority` (string): Filter by priority
     - `sprint` (string): Filter by sprint name
     - `workType` (string): Filter by issue work type name
     - `startAfterDate` (string): Filter issues that start AFTER or ON this date (YYYY-MM-DD format)
     - `startBeforeDate` (string): Filter issues that start BEFORE or ON this date (YYYY-MM-DD format)
     - `dueAfterDate` (string): Filter issues that are due AFTER or ON this date (YYYY-MM-DD format)
     - `dueBeforeDate` (string): Filter issues that are due BEFORE or ON this date (YYYY-MM-DD format)
     - `createdAfterDate` (string): Filter issues that were created AFTER or ON this date (YYYY-MM-DD format)
     - `createdBeforeDate` (string): Filter issues that were created BEFORE or ON this date (YYYY-MM-DD format)
     - `pageSize` (number, default: 10): Max results

4. **`list_project`**: Show project list with authenticated user, without inputs.
  
5. **`create_issue`**:Creates a new Leiga issue.
   - Required inputs:
     - `summary` (string): Issue summary
     - `projectName` (string): Project name
   - Optional inputs:
     - `description` (string): Issue description
     - `statusName` (string): Issue status (e.g., 'Not Started', 'In Progress', 'Done' )
     - `priority` (string): priority name (e.g., 'Lowest', 'Low', 'Medium', 'High', 'Highest')
     - `sprint` (string): Sprint name
     - `workType` (string): Work type name (e.g., 'Story', 'Chore', 'Bug')

6. **`get_issue_options`**: Get selectable option fields for an issue.
   - Required inputs:
     - `issueId` (string): Issue ID or issue number (e.g., 12345 or ABC-678)

7. **`update_issue`**: Update an issue by ID or issue number.
   - Required inputs:
     - `issueId` (string): Issue ID or issue number (e.g., 12345 or ABC-678)
   - Optional inputs:
     - `summary` (string): New summary
     - `description` (string): New description
     - `statusName` (string): Workflow status name to set
     - `priorityName` (string): Priority name to set
     - `assigneeName` (string): Assignee name to set
     - `labels` (string[]): Label names to set
     - `follows` (string[]): Follower names to set
     - `releaseVersionName` (string): Release version name to set
     - `dueDate` (string | number): Due date (YYYY-MM-DD) or timestamp in ms
     - `startDate` (string | number): Start date (YYYY-MM-DD) or timestamp in ms

8. **`list_issue_comments`**: List comments of an issue with pagination.
   - Required inputs:
     - `issueId` (string): Issue ID or issue number (e.g., 12345 or ABC-678)
   - Optional inputs:
     - `pageNumber` (number): Page number (default 1)
     - `pageSize` (number): Page size (default 20)

9. **`create_comment`**: Create a comment or reply for an issue.
   - Required inputs:
     - `issueId` (string): Issue ID or issue number (e.g., 12345 or ABC-678)
     - `content` (string): Comment content
   - Optional inputs:
     - `commentId` (number): Comment ID to reply to (for replies)

10. **`current_date`**: Get current date (local timezone).
   - No inputs.

11. **`list_project_members`**: List members of a specific project.
   - Required inputs:
     - `projectId` (number): Project ID
   - Optional inputs:
     - `keyword` (string): Keyword to search members
     - `pageNumber` (number): Page number (default 1)
     - `pageSize` (number): Page size (default 20)

12. **`list_org_members`**: List all organization members with optional search.
   - Optional inputs:
     - `key` (string): Keyword to search members
     - `pageNumber` (number): Page number (default 1)
     - `pageSize` (number): Page size (default 20)

## Usage examples

Some example prompts you can use with Cursor Desktop to interact with Leiga:

1. "Show me all my high-**priority** issues" → execute the `my_assigned_issues` tool to find issues assigned to you with priority is high

2. "Show the detail of issue: XX-1" → use `get_issue_detail` tool to return the detail info of issue number is XX-1

3. "Find all in progress issues" → use `search_all_issues` to locate issues with in progress task

4. "list projects" ->  use `list_project` to list all the projects you have access to.

5. "create issue 'xxxx summary' in xxx project " ->  use `create_issue` to help you create a issue.

6. "show selectable fields for issue XX-1" → use `get_issue_options` with `issueId: "XX-1"` to list all option fields and their valid values

7. "set XX-1 to Done and assign to Alice" → use `update_issue` with `issueId: "XX-1"`, `statusName: "Done"`, `assigneeName: "Alice"`

8. "list comments for XX-1, page 2, 10 per page" → use `list_issue_comments` with `issueId: "XX-1"`, `pageNumber: 2`, `pageSize: 10`

9. "reply to comment 123 on XX-1: Looks good" → use `create_comment` with `issueId: "XX-1"`, `content: "Looks good"`, `commentId: 123`

10. "what's today's date?" → use `current_date` to return the current local date

11. "list members of project 456" → use `list_project_members` with `projectId: 456`

12. "search org members by 'john'" → use `list_org_members` with `key: "john"`

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
