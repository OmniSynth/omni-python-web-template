import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type TimezoneOption, timezoneCommandFilter } from "@/lib/datetime";
import { fieldControlClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";

interface TimezoneComboboxProps {
  id?: string;
  value: string;
  options: TimezoneOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/** 可搜索时区选择（Popover + Command，shadcn Combobox 模式）。 */
export function TimezoneCombobox({
  id,
  value,
  options,
  onChange,
  className,
  placeholder = "选择时区",
}: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => options.find((opt) => opt.value === value)?.label ?? value, [options, value]);

  const filter = useMemo(
    () => (itemValue: string, search: string) => timezoneCommandFilter(options, itemValue, search),
    [options],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(fieldControlClass, "justify-between font-normal", className)}
          />
        }
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command filter={filter}>
          <CommandInput placeholder="搜索时区，如 +8、Shanghai" />
          <CommandList className="max-h-52">
            <CommandEmpty>未找到时区</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  keywords={[opt.label, opt.value, opt.value.replace(/_/g, " ")]}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4 shrink-0", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
