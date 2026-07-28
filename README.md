# WebSearch branch
This branch is modified to support local webseach by scraping duckduckgo.

## Check out
```bash
cd ~
mkdir -p github.com
mkdir -p github.com/xeus2001
cd github.com/xeus2001
git clone git@github.com:xeus2001/opencode.git
cd opencode
git switch dev_websearch
git pull
```

## Compile and install
```bash
# On MacOS `brew install bun`
# On Linux: We need `nodejs`, `npm` and `bun` being installed
#           If typescript support is not yet installed globally (`tsc --version`), do it now:
#           sudo npm install -g typescript
cd ~/github.com/xeus2001/opencode
bun install

# Ones the above has been done, we can recompile via:
./packages/opencode/script/build.ts --single
# linux-test: packages/opencode/dist/opencode-linux-x64/bin/opencode
# macos-test: packages/opencode/dist/opencode-darwin-arm64/bin/opencode
```

On Linux install like:
```bash
mkdir -p ~/.local/bin
cp packages/opencode/dist/opencode-linux-x64/bin/opencode ~/.local/bin/localcode
# To uninstall the custom build, do `rm ~/.local/bin/localcode`
```

On MaOS install like:
```bash
mkdir -p ~/bin
cp packages/opencode/dist/opencode-darwin-arm64/bin/opencode ~/bin/localcode
# To uninstall the custom build, do `rm ~/.local/bin/localcode`
```

On MacOS it may be neccesarry to add the path `/Users/$USER/bin` into `~/.zshrc`, should looks like:
```
export PATH=/Users/$USER/bin\
:/Users/$USER/.opencode/bin\
:...
```
With `...` just being other paths.

## Show available models
```bash
# To shows supported models:
opencode models github-copilot

# To update models list:
opencode models github-copilot --refresh
```

