let parkingRoot: HTMLElement | null = null;

export function getParkingContainer(doc: Document = document): HTMLElement {
  if (parkingRoot && parkingRoot.isConnected) {
    return parkingRoot;
  }

  const el = doc.createElement("div");
  el.setAttribute("data-terminus-parking", "true");
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    opacity: "0",
    pointerEvents: "none",
  });
  doc.body.appendChild(el);
  parkingRoot = el;
  return el;
}

export function resetParkingContainerForTests(): void {
  if (parkingRoot?.parentNode) {
    parkingRoot.parentNode.removeChild(parkingRoot);
  }
  parkingRoot = null;
}
