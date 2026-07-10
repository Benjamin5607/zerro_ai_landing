import os
import requests
import re
from groq import Groq

# --- 설정 ---
GITHUB_USERNAME = "benjamin5607"
INDEX_FILE_PATH = "index.html"
MAX_REPOS = 6

# Curated repos already shown in Eccentric Lab sections — skip in auto overflow
FEATURED_REPOS = {
    "zerro_ai_landing", "Daedongyeojido", "model_JekyllHyde", "saigon_class",
    "halal_plane", "AI-Teacher-Assistant", "traveleditor", "emily_pantheon",
    "drunken_plane", "jumadeung_cinema", "space_manger", "global_culture_risk_dashboard",
    "global-risk-war-room", "global_slang_dictionary", "Sereme_Hypatia", "readme_generator",
}

try:
    groq_api_key = os.environ['GROQ_API_KEY']
except KeyError:
    print("오류: GROQ_API_KEY 환경 변수가 설정되지 않았습니다.")
    exit(1)

client = Groq(api_key=groq_api_key)

def get_readme_summary(repo_full_name):
    readme_url = f"https://api.github.com/repos/{repo_full_name}/readme"
    headers = {'Accept': 'application/vnd.github.v3.raw'}
    try:
        readme_response = requests.get(readme_url, headers=headers)
        readme_response.raise_for_status()
        readme_content = readme_response.text
        if not readme_content.strip():
            return "No content in README."
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "Summarize this README in 1-2 short English sentences. Focus on purpose and tech."
                },
                {"role": "user", "content": readme_content},
            ],
            model="llama-3.1-8b-instant",
        )
        return chat_completion.choices[0].message.content.strip()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return None
        return f"Error fetching README: {e}"
    except Exception as e:
        return f"An error occurred: {e}"

def generate_repo_html(repo, summary):
    desc = repo.get('description') or summary or "Experimental project from Eccentric Lab."
    if len(desc) > 140:
        desc = desc[:137] + "..."
    return f"""
          <a href="{repo['html_url']}" target="_blank" rel="noopener" class="lab-card lab-research block border rounded-2xl p-5 sm:p-6 bg-black/30">
            <h4 class="text-sm font-bold text-white mb-2 truncate">{repo['name']}</h4>
            <p class="text-gray-500 text-xs leading-relaxed h-12 overflow-hidden">{desc}</p>
          </a>
    """

def main():
    print("Fetching repositories from GitHub...")
    repos_url = f"https://api.github.com/users/{GITHUB_USERNAME}/repos?sort=updated&direction=desc&per_page=100"
    repos_response = requests.get(repos_url)
    repos_response.raise_for_status()
    all_repos = repos_response.json()

    final_html_content = ""
    repo_count = 0

    for repo in all_repos:
        if repo_count >= MAX_REPOS:
            break
        if repo['fork'] or repo['name'] in FEATURED_REPOS:
            continue

        print(f"Processing repo: {repo['name']}...")
        summary = get_readme_summary(repo['full_name'])
        if summary:
            print(f" -> Summary: {summary}")
            final_html_content += generate_repo_html(repo, summary)
            repo_count += 1
        else:
            print(" -> Skipping repo (No README or error).")

    if not final_html_content:
        final_html_content = '<p class="text-center text-gray-600 text-sm col-span-full">No additional experiments to list right now.</p>'

    print(f"\nUpdating {INDEX_FILE_PATH}...")
    with open(INDEX_FILE_PATH, 'r', encoding='utf-8') as f:
        index_content = f.read()

    updated_content = re.sub(
        r"<!-- REPO_LIST_START -->(.|\n)*?<!-- REPO_LIST_END -->",
        f"<!-- REPO_LIST_START -->{final_html_content}<!-- REPO_LIST_END -->",
        index_content
    )

    with open(INDEX_FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(updated_content)

    print("Update complete!")

if __name__ == "__main__":
    main()
