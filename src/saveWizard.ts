type Todo = () => Promise<void> | void;
const beforeSaveTodos: Todo[] = [];
const afterLoadTodos: Todo[] = [];

export const saveWizard = {
  register({ beforeSave, afterLoad }: { beforeSave: Todo; afterLoad: Todo }) {
    beforeSaveTodos.push(beforeSave);
    afterLoadTodos.push(afterLoad);
  },
  async prepareSave() {
    const promises = beforeSaveTodos.map((t) => t());
    await Promise.all(promises);
  },
  async finishLoad() {
    const promises = afterLoadTodos.map((t) => t());
    await Promise.all(promises);
  },
};
