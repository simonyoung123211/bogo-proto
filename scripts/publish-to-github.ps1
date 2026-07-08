# 将本地代码推送到 GitHub，供 Netlify 关联自动部署
# 用法：先在终端执行 gh auth login 完成 GitHub 登录，再运行本脚本

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Error '未找到 GitHub CLI，请先安装：winget install GitHub.cli'
}

gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host '请先登录 GitHub：' -ForegroundColor Yellow
  Write-Host '  gh auth login --hostname github.com --git-protocol https --web'
  exit 1
}

$repo = 'bogo-proto'
$remoteUrl = "https://github.com/simonyoung123211/$repo.git"

git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  git remote add origin $remoteUrl
} else {
  git remote set-url origin $remoteUrl
}

gh repo view "simonyoung123211/$repo" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "创建 GitHub 仓库 $repo ..."
  gh repo create $repo --public --source=. --remote=origin --push
} else {
  Write-Host "推送到已有仓库 $repo ..."
  git push -u origin master
}

if ($LASTEXITCODE -eq 0) {
  Write-Host ''
  Write-Host 'GitHub 推送成功。接下来在 Netlify 关联仓库：' -ForegroundColor Green
  Write-Host '  1. 打开 https://app.netlify.com/projects/bogo-proto-qmai/overview'
  Write-Host '  2. Project configuration → Build & deploy → Link repository'
  Write-Host "  3. 选择 GitHub 仓库 simonyoung123211/$repo，分支 master"
  Write-Host '  4. 构建命令 npm run build，发布目录 dist（netlify.toml 已配置）'
}
