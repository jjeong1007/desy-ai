/** Ideas service. Thin client wrappers over the server actions in src/server/actions/ideas.ts. */
export {
  createFromAlternative,
  deleteIdea,
  getIdea,
  listIdeas,
  resetDemoData,
  saveDraft,
  updateIntake,
} from "@/server/actions/ideas";

export { EMPTY_INTAKE } from "@/config/intake";
