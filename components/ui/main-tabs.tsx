import { cn } from "@/lib/utils"
import { motion } from "motion/react"

interface Tab {
  id: string
  label: string
}

interface MainTabsProps {
  currentTab: string
  setCurrentTab: (tabId: string) => void
  tabs: Tab[]
  disabled?: boolean
  layoutId?: string
  containerClassName?: string
}

export const MainTabs = ({
  currentTab,
  setCurrentTab,
  tabs,
  disabled,
  layoutId = "tabs-underline",
  containerClassName,
}: MainTabsProps) => {
  return (
    <>
      {/* For smaller devices, tabs are rendered in a column */}
      <div className={cn("border-l border-border flex sm:hidden flex-col items-start text-sm", containerClassName)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "py-3 px-4 focus:outline-none relative transition-colors",
              currentTab === tab.id
                ? "text-primary font-semibold disabled:text-muted-foreground/40 disabled:font-normal"
                : "text-muted-foreground hover:text-foreground disabled:text-muted-foreground/40"
            )}
            onClick={() => setCurrentTab(tab.id)}
            disabled={disabled}
          >
            {tab.label}
            {currentTab === tab.id && (
              <motion.div
                layoutId={`${layoutId}-mobile`}
                className={cn(
                  "absolute top-0 left-0 w-1 h-full rounded-r-md",
                  disabled ? "bg-muted-foreground/40" : "bg-primary"
                )}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 30,
                  duration: 0.3,
                }}
              />
            )}
          </button>
        ))}
      </div>
      {/* For larger devices, tabs are rendered in a row */}
      <div className={cn("border-b border-border hidden sm:flex text-sm", containerClassName)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "py-3 px-5 focus:outline-none relative transition-colors group",
              currentTab === tab.id
                ? "text-primary font-semibold disabled:text-muted-foreground/40 disabled:font-normal"
                : "text-muted-foreground hover:text-foreground disabled:text-muted-foreground/40"
            )}
            onClick={() => setCurrentTab(tab.id)}
            disabled={disabled}
          >
            {tab.label}
            {currentTab === tab.id ? (
              <motion.div
                layoutId={layoutId}
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5 rounded-t-md",
                  disabled ? "bg-muted-foreground/40" : "bg-primary"
                )}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 30,
                  duration: 0.3,
                }}
              />
            ) : <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent transition-colors group-hover:bg-muted-foreground" />}
          </button>
        ))}
      </div>
    </>
  )
} 