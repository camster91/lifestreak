#!/usr/bin/env bash
# Coolify-helper-compatible wrapper. All recovery files stay on the Docker host.
set -euo pipefail
[[ ${1:-} =~ ^[a-z0-9]{20,40}$ ]] || exit 2
[[ ${2:-build} == backup || ${2:-build} == build ]] || exit 2
helper=sha256:c7a7748b233da32a7541213bd6c124d104d2221ac7d9020976dbfa02ba88e57d
docker run --rm -i --pull=never --network none --entrypoint bash \
  --mount type=bind,source=/opt/retired-deployments,target=/recovery \
  -v /run/ashbi-docker-capacity:/lock \
  --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
  "$helper" -s -- "$1" "${2:-build}" <<'RECOVERY'
set -euo pipefail
umask 077
exec 9>/lock/maintenance.lock
flock -x 9
if [[ $2 == build ]]; then
  df -P /recovery | awk 'NR == 2 {gsub(/%/, "", $5); if ($5 >= 80) exit 1}' || {
    echo 'Release build blocked by the existing 80 percent capacity policy.' >&2
    exit 1
  }
fi
mapfile -t ids < <(docker ps -q --filter "label=com.docker.compose.project=$1" --filter label=com.docker.compose.service=app)
[[ ${#ids[@]} -le 1 ]] || exit 1
container=${ids[0]:-lifestreak-c6313758a10efc2495580db0c91630baa3582aaa}
[[ $(docker inspect -f '{{.State.Running}}' "$container") == true ]] || exit 1
[[ $(docker inspect -f '{{len .Mounts}}' "$container") == 0 ]] || exit 1
stamp="$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM"
folder="/recovery/lifestreak-helper-predeploy-$stamp"
mkdir -m 700 "$folder"
docker inspect "$container" > "$folder/container-inspect.private.json"
manifest() {
  docker exec "$container" sh -c 'cd /usr/share/nginx/html && find . -type f -exec sha256sum {} \;' | LC_ALL=C sort
}
manifest > "$folder/source.before.sha256"
docker exec "$container" tar -cf - -C /usr/share/nginx/html . > "$folder/webroot.private.tar"
tar -tf "$folder/webroot.private.tar" | awk '/^\// || /(^|\/)\.\.(\/|$)/ {bad=1} END {exit bad}'
tar -tvf "$folder/webroot.private.tar" | awk 'substr($0,1,1)!="d" && substr($0,1,1)!="-" {bad=1} END {exit bad}'
mkdir -m 700 "$folder/restored"
tar -xf "$folder/webroot.private.tar" -C "$folder/restored"
(cd "$folder/restored" && find . -type f -exec sha256sum {} \; | LC_ALL=C sort) > "$folder/restored.sha256"
cmp "$folder/source.before.sha256" "$folder/restored.sha256"
manifest > "$folder/source.after.sha256"
cmp "$folder/source.before.sha256" "$folder/source.after.sha256"
docker exec "$container" cat /etc/nginx/conf.d/default.conf > "$folder/nginx.private.conf"
image=$(docker inspect -f '{{.Image}}' "$container")
tag="ashbi-recovery/lifestreak-helper:${stamp,,}"
source="ashbi-recovery/lifestreak-helper-source:${stamp,,}"
docker image inspect "$image" > "$folder/image-inspect.private.json"
docker tag "$image" "$source"
printf 'FROM %s\nLABEL coolify.managed="true" ashbi.retired="true" ashbi.recovery="lifestreak"\n' "$source" |
  docker build --pull=false --network=none -t "$tag" - > "$folder/image-retention.private.log" 2>&1
before_layers=$(docker image inspect -f '{{json .RootFS.Layers}}' "$image")
after_layers=$(docker image inspect -f '{{json .RootFS.Layers}}' "$tag")
[[ "$before_layers" == "$after_layers" ]]
archive=$(sha256sum "$folder/webroot.private.tar" | awk '{print $1}')
retained=$(docker image inspect -f '{{.Id}}' "$tag")
count=$(wc -l < "$folder/restored.sha256")
printf '{"backupDirectory":"/opt/retired-deployments/lifestreak-helper-predeploy-%s","fileCount":%s,"memberHashesMatch":true,"archiveSHA256":"%s","sourceImage":"%s","protectedImage":"%s","protectedTag":"%s","rootFSLayersMatch":true,"mode":"%s","liveContainerStopped":false}\n' \
  "$stamp" "$count" "$archive" "$image" "$retained" "$tag" "$2" > "$folder/recovery-proof.json"
cat "$folder/recovery-proof.json"
RECOVERY
