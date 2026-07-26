import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta o que o teste anterior renderizou. Sem isto, um teste enxerga o
// DOM do outro e a suíte fica dependente de ordem.
afterEach(cleanup);
