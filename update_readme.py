import os
import requests
import re
from groq import Groq

# --- 설정 ---
GITHUB_USERNAME = "benjamin5607"
INDEX_FILE_PATH = "index.html"
MAX_REPOS = 6 # 표시할 최대 리포지토리 수

# --- API 키 가져오기 ---
try:
    groq_api_key = os.environ['GROQ_API_KEY']
except KeyError:
    print("오류: GROQ_API_KEY 환경 변수가 설정되지 않았습니다.")
    exit(1)

client = Groq(api_key=groq_api_key)

def get_readme_summary(repo_full_name):
    """리포지토리의 README 내용을 가져와 Groq API로 요약 및 번역합니다."""
    readme_url = f"https://api.github.com/repos/{repo_full_name}/readme"
    headers = {'Accept': 'application/vnd.github.v3.raw'}
    try:
        readme_response = requests.get(readme_url, headers=headers)
        readme_response.raise_for_status()
        readme_content = readme_response.text

        if not readme_content.strip():
            return "No content in README."

        # Groq API 호출
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant. You will be given the content of a README.md file. Your task is to summarize it concisely within 2 or 3 short sentences. The summary must be in English, even if the original text is in another language. Focus on the project's main purpose and technology used."
                },
                {
                    "role": "user",
                    "content": readme_content,
                }
            ],
            model="llama-3.1-8b-instant", # 2026년 3월에 llama-instant가 없다면 llama3-8b-8192가 좋은 대안입니다.
        )
        summary = chat_completion.choices[0].message.content
        return summary.strip()

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return None # README 파일이 없음
        return f"Error fetching README: {e}"
    except Exception as e:
        return f"An error occurred: {e}"

def generate_repo_html(repo, summary):
    """리포지토리 정보를 바탕으로 HTML 카드 생성"""
    return f"""
          <a href="{repo['html_url']}" target="_blank" class="block border border-gray-800 p-6 rounded-xl hover:border-blue-500/50 hover:bg-blue-900/10 transition-all transform hover:-translate-y-1">
            <h3 class="text-xl font-bold mb-2 truncate">{repo['name']}</h3>
            <p class="text-gray-400 text-sm h-16 overflow-hidden">{summary}</p>
            <div class="flex items-center gap-4 mt-4 text-xs text-gray-500">
                <span>⭐ {repo['stargazers_count']}</span>
                <span>{repo['language'] or ''}</span>
                <span>{repo['updated_at'][:10]}</span>
            </div>
          </a>
    """

def main():
    """메인 로직: 리포지토리 정보 가져오기, HTML 생성 및 파일 업데이트"""
    print("Fetching repositories from GitHub...")
    repos_url = f"https://api.github.com/users/{GITHUB_USERNAME}/repos?sort=updated&direction=desc"
    repos_response = requests.get(repos_url)
    repos_response.raise_for_status()
    all_repos = repos_response.json()

    final_html_content = ""
    repo_count = 0

    for repo in all_repos:
        if repo_count >= MAX_REPOS:
            break
        if repo['fork']:
            continue

        print(f"Processing repo: {repo['name']}...")
        summary = get_readme_summary(repo['full_name'])

        if summary: # README가 있고 요약이 성공한 경우에만 추가
            print(f" -> Summary: {summary}")
            final_html_content += generate_repo_html(repo, summary)
            repo_count += 1
        else:
            print(f" -> Skipping repo (No README or error).")
    
    if not final_html_content:
        final_html_content = '<p class="text-center text-gray-500 col-span-full">Could not load projects. Please check back later.</p>'

    print(f"\nUpdating {INDEX_FILE_PATH}...")
    with open(INDEX_FILE_PATH, 'r', encoding='utf-8') as f:
        index_content = f.read()

    # 마커 사이의 내용을 교체
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
