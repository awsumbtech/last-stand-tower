// LookRegistry: look id -> look class. Status looks name the status they follow (static status);
// event looks (Chain Spark) name the ELEMENT_HIT element that triggers them (static event) and are
// attached for a fixed time by LookLayer. Loaded before the look classes, which register themselves.
LST.LookRegistry = {
  looks: {},
  register(id, cls) { this.looks[id] = cls; return cls; },
  get(id) { return this.looks[id] || null; },
  statusLooks() { return Object.entries(this.looks).filter(([, c]) => c.status); },
  eventLooks(element) { return Object.entries(this.looks).filter(([, c]) => c.event && c.event === element); },
};
