// Story Editor settings (what the editor at /admin/ shows).
// On GitHub Pages the repository is detected automatically, so you normally don't need to change anything.
// If you host elsewhere (e.g. Vercel), replace YOUR-USERNAME/YOUR-REPO-NAME below with your GitHub username/repository.
window.STORY_EDITOR_CONFIG = {
  "backend": {
    "name": "github",
    "repo": "YOUR-USERNAME/YOUR-REPO-NAME",
    "branch": "main",
    "commit_messages": {
      "create": "Add {{collection}} “{{slug}}”",
      "update": "Update {{collection}} “{{slug}}”",
      "delete": "Delete {{collection}} “{{slug}}”",
      "uploadMedia": "Upload “{{path}}”",
      "deleteMedia": "Delete “{{path}}”"
    }
  },
  "media_folder": "content/images",
  "public_folder": "/content/images",
  "collections": [
    {
      "name": "chapters",
      "label": "Chapters",
      "label_singular": "Chapter",
      "description": "Paste a translated chapter, choose which story it belongs to, and save.",
      "folder": "content/chapters",
      "create": true,
      "extension": "md",
      "format": "frontmatter",
      "slug": "{{story}}-{{slug}}",
      "summary": "{{title}}  ·  {{story}}  ·  {{date}}",
      "sortable_fields": [
        "date",
        "title",
        "story",
        "number"
      ],
      "fields": [
        {
          "label": "Chapter title",
          "name": "title",
          "widget": "string"
        },
        {
          "label": "Story",
          "name": "story",
          "widget": "relation",
          "collection": "stories",
          "value_field": "{{slug}}",
          "search_fields": [
            "title"
          ],
          "display_fields": [
            "title"
          ],
          "hint": "Which book / event / character story this chapter belongs to."
        },
        {
          "label": "Chapter number",
          "name": "number",
          "widget": "number",
          "value_type": "int",
          "default": 1,
          "hint": "Sets the order inside the story (1, 2, 3…)."
        },
        {
          "label": "Date",
          "name": "date",
          "widget": "datetime",
          "format": "YYYY-MM-DD",
          "time_format": false,
          "default": "{{now}}",
          "hint": "Newest dates appear first in \"Latest updates\" on the home page."
        },
        {
          "label": "Hide this chapter",
          "name": "hidden",
          "widget": "boolean",
          "default": false,
          "required": false,
          "hint": "Turn on to keep it off the site (e.g. still translating)."
        },
        {
          "label": "Text",
          "name": "body",
          "widget": "markdown",
          "hint": "Tip: bold the speaker's name, e.g. **Aria:** Hello. Use the quote button for narration."
        }
      ]
    },
    {
      "name": "stories",
      "label": "Stories",
      "label_singular": "Story",
      "description": "A book, event or character story. It only appears on the site once it has a chapter.",
      "folder": "content/stories",
      "create": true,
      "extension": "json",
      "format": "json",
      "summary": "{{title}}  ·  {{section}}",
      "sortable_fields": [
        "title",
        "section",
        "number"
      ],
      "fields": [
        {
          "label": "Title",
          "name": "title",
          "widget": "string"
        },
        {
          "label": "Section",
          "name": "section",
          "widget": "relation",
          "collection": "sections",
          "value_field": "{{slug}}",
          "search_fields": [
            "title"
          ],
          "display_fields": [
            "title"
          ],
          "hint": "e.g. Main Story, Events, Character Stories."
        },
        {
          "label": "Order",
          "name": "number",
          "widget": "number",
          "value_type": "int",
          "default": 1,
          "hint": "Order inside the section (1 shows first)."
        },
        {
          "label": "Description",
          "name": "description",
          "widget": "text",
          "required": false
        },
        {
          "label": "Cover image",
          "name": "cover",
          "widget": "image",
          "required": false,
          "hint": "Portrait images (3:4, e.g. 600×800) look best."
        },
        {
          "label": "Hide this story",
          "name": "hidden",
          "widget": "boolean",
          "default": false,
          "required": false
        }
      ]
    },
    {
      "name": "sections",
      "label": "Sections",
      "label_singular": "Section",
      "description": "Groups of stories on the home page, e.g. Main Story, Events, Character Stories. Empty sections are hidden.",
      "folder": "content/sections",
      "create": true,
      "extension": "json",
      "format": "json",
      "sortable_fields": [
        "title",
        "number"
      ],
      "fields": [
        {
          "label": "Title",
          "name": "title",
          "widget": "string"
        },
        {
          "label": "Game",
          "name": "game",
          "widget": "relation",
          "collection": "games",
          "value_field": "{{slug}}",
          "search_fields": [
            "title"
          ],
          "display_fields": [
            "title"
          ],
          "required": false,
          "hint": "Only needed if you translate more than one game."
        },
        {
          "label": "Order",
          "name": "number",
          "widget": "number",
          "value_type": "int",
          "default": 1,
          "hint": "Order on the home page (1 shows first)."
        },
        {
          "label": "Description",
          "name": "description",
          "widget": "text",
          "required": false
        },
        {
          "label": "Hide this section",
          "name": "hidden",
          "widget": "boolean",
          "default": false,
          "required": false
        }
      ]
    },
    {
      "name": "games",
      "label": "Games",
      "label_singular": "Game",
      "description": "Only needed if you translate more than one game.",
      "folder": "content/games",
      "create": true,
      "extension": "json",
      "format": "json",
      "fields": [
        {
          "label": "Title",
          "name": "title",
          "widget": "string"
        },
        {
          "label": "Order",
          "name": "number",
          "widget": "number",
          "value_type": "int",
          "default": 1
        }
      ]
    },
    {
      "name": "settings",
      "label": "Site settings",
      "files": [
        {
          "name": "site",
          "label": "Site title & text",
          "file": "content/settings.json",
          "fields": [
            {
              "label": "Site title",
              "name": "title",
              "widget": "string"
            },
            {
              "label": "Intro text on the home page",
              "name": "intro",
              "widget": "text",
              "required": false
            },
            {
              "label": "Footer text",
              "name": "footer",
              "widget": "text",
              "required": false
            },
            {
              "label": "How many chapters to show in \"Latest updates\"",
              "name": "latestCount",
              "widget": "number",
              "value_type": "int",
              "default": 8
            }
          ]
        }
      ]
    }
  ]
};
