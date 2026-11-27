import { Fragment } from "react";

// Datas separadas por vírgula, sem quebrar uma data no meio da linha.
export function DateList({ dates }: { dates: string[] }) {
  return (
    <>
      {dates.map((date, index) => (
        <Fragment key={date}>
          {index > 0 && ", "}
          <span className="nowrap">{date}</span>
        </Fragment>
      ))}
    </>
  );
}
