import type { Idea } from "@/types";
import { invoiceIdea } from "./invoice";
import { notesIdea } from "./notes";
import { tutorIdea } from "./tutor";

export { invoiceIdea, tutorIdea, notesIdea };
export const SEED_IDEAS: Idea[] = [invoiceIdea, tutorIdea, notesIdea];
