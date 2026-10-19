/** RFC 9457 problem details, as returned by the API with `application/problem+json`. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: ProblemFieldError[];
}

export interface ProblemFieldError {
  field?: string;
  message: string;
}
