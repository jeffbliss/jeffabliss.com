# Source this file: `source activate.sh`
# Activates the Python venv (UnityPy) and the project-local .NET SDK (ilspycmd).
_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$_ROOT/.venv/bin/activate"
export DOTNET_ROOT="$_ROOT/.dotnet"
export PATH="$_ROOT/.dotnet:$PATH"
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export VALHEIM_DATA="$HOME/Library/Application Support/Steam/steamapps/common/Valheim/valheim.app/Contents/Resources/Data"
unset _ROOT
