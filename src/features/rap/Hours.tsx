import styled from "@emotion/styled/macro";
import { detect } from "detect-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import Hour from "./Hour";
import { RapPayload } from "./rapSlice";
import ReportWatchdog from "./ReportWatchdog";
import Nav from "./Nav";
import roundedScrollbar from "./roundedScrollbar";
import { css } from "@emotion/react/macro";

const browser = detect();

enum ScrollPosition {
  Beginning,
  Middle,
  End,
}

enum Direction {
  Forward,
  Back,
}

const minHourWidth = 350;

const ScrollContainer = styled.div`
  position: relative;
  display: flex;
`;

const Container = styled.div`
  --hours-gutter: 1.4em;

  display: flex;

  overflow: auto;
  min-height: 0;

  scroll-snap-type: x mandatory;

  ${browser?.os !== "Mac OS" &&
  css`
    @media (any-hover: hover) {
      ${roundedScrollbar}

      ::-webkit-scrollbar-track,
      ::-webkit-scrollbar-thumb {
        margin: 0 2em;
      }
    }
  `}

  scrollbar-color: rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.15);

  > * {
    flex-shrink: 0;
  }
`;

const HourContainer = styled.section`
  scroll-snap-align: start;

  margin: 0 calc(-1 * var(--right-safe-area)) var(--hours-gutter)
    calc(-1 * var(--left-safe-area));
  padding: 0 var(--right-safe-area) 0 var(--left-safe-area);

  &:first-of-type {
    padding-left: calc(2 * var(--left-safe-area));
  }
  &:last-of-type {
    padding-right: var(--right-safe-area);

    > div {
      margin-right: var(--hours-gutter);
    }
  }
`;

const StyledHour = styled(Hour)`
  margin-left: var(--hours-gutter);

  width: calc(100vw - calc(var(--hours-gutter) * 4));

  ${() => {
    let css = "";

    for (let i = 1; i <= 10; i++) {
      css += `
        @media (min-width: ${i * minHourWidth}px) {
          width: calc(${100 / i}vw - var(--hours-gutter) - calc(${
        1 / i
      } * var(--hours-gutter)) - calc(${
        1 / i
      } * var(--right-safe-area)) - calc(${1 / i} * var(--left-safe-area)));
        }
      `;
    }

    return css;
  }}
`;

interface TableProps {
  rap: RapPayload;
}

export default function Hours({ rap }: TableProps) {
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(
    ScrollPosition.Beginning
  );

  // Each report can have a different # of rows. This normalizes that
  const rows = rap.data[0].data.filter(({ height }) => height < 5800).length;

  const data = useMemo(
    () =>
      rap.data.map((rap) => (
        <HourContainer key={rap.date}>
          <StyledHour rap={rap} rows={rows} />
        </HourContainer>
      )),
    [rap, rows]
  );

  useEffect(() => {
    // Safari 14 and less are broke af
    // TODO: Remove once Safari 16 is released (~ September 2022)
    if (browser?.name === "safari" && +browser?.version.split(".")[0] <= 14)
      return;

    onScroll();

    const callback = (e: KeyboardEvent) => {
      if (!scrollViewRef.current) return;

      switch (e.key) {
        case "ArrowLeft": {
          e.preventDefault();
          scroll(Direction.Back);
          return;
        }
        case "ArrowRight": {
          e.preventDefault();
          scroll(Direction.Forward);
        }
      }
    };

    document.addEventListener("keydown", callback);
    return () => document.removeEventListener("keydown", callback);
  }, []);

  function onScroll() {
    const scrollView = scrollViewRef.current;
    if (!scrollView) return;

    let position: ScrollPosition = ScrollPosition.Middle;
    if (scrollView.scrollLeft <= 200) {
      position = ScrollPosition.Beginning;
    } else if (
      scrollView.scrollLeft >=
      scrollView.scrollWidth - scrollView?.clientWidth - 200
    ) {
      position = ScrollPosition.End;
    }
    setScrollPosition(position);
  }

  useEffect(() => {
    const scrollView = scrollViewRef.current;
    if (!scrollView) return;

    onScroll();

    scrollView.addEventListener("scroll", onScroll);
    return () => scrollView.removeEventListener("scroll", onScroll);
  }, [scrollViewRef]);

  function scroll(direction: Direction) {
    if (!scrollViewRef.current) throw new Error("Scrollview not found");

    const section = scrollViewRef.current.querySelector("section");

    if (!section) throw new Error("Section not found");

    switch (direction) {
      case Direction.Back: {
        scrollViewRef.current.scrollBy(-(section.clientWidth / 2), 0);
        return;
      }
      case Direction.Forward: {
        scrollViewRef.current.scrollBy(section.clientWidth / 2, 0);
      }
    }
  }

  return (
    <>
      <Container ref={scrollViewRef}>
        <ScrollContainer>
          <Nav
            left
            visible={scrollPosition !== ScrollPosition.Beginning}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => scroll(Direction.Back)}
          />
          {data}
          <Nav
            right
            visible={scrollPosition !== ScrollPosition.End}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => scroll(Direction.Forward)}
          />
        </ScrollContainer>
      </Container>

      <ReportWatchdog rap={rap} />
    </>
  );
}
