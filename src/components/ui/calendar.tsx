import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium text-gray-100",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-1 top-0 inline-flex items-center justify-center rounded-md h-7 w-7 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-gray-100",
        button_next:
          "absolute right-1 top-0 inline-flex items-center justify-center rounded-md h-7 w-7 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-gray-100",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button:
          "h-9 w-9 p-0 font-normal rounded-md hover:bg-gray-700 text-gray-100 inline-flex items-center justify-center",
        selected: "bg-red-700 text-white hover:bg-red-600 focus:bg-red-700",
        today: "bg-gray-700 text-gray-100",
        outside: "text-gray-600 opacity-50",
        disabled: "text-gray-600 opacity-50",
        range_middle: "bg-red-900/50 rounded-none",
        range_start: "bg-red-700 rounded-l-md rounded-r-none",
        range_end: "bg-red-700 rounded-r-md rounded-l-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
