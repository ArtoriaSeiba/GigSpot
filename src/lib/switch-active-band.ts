export function switchActiveBand(bandId: string, destination = "/dashboard") {
  document.cookie = `activeBandId=${bandId}; path=/; max-age=31536000`;
  window.location.assign(destination);
}
